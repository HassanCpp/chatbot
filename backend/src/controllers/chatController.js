import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import QueryGap from '../models/QueryGap.js';
import RagService from '../services/ragService.js';
import OpenAiService from '../services/openAiService.js';
import { toolDefinitions, executeTool } from '../tools/chatbotTools.js';
import { qdrantClient } from '../config/qdrant.js';
import { generateSparseVector } from '../utils/sparseVectorizer.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Perform a local cross-encoder token-matching overlap reranking pass 
 * on candidate documents to score query relevance.
 */
function localCrossEncoderRerank(query, items, keyExtractor) {
  const queryTokens = new Set(query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2));
  
  return items.map(item => {
    const text = keyExtractor(item).toLowerCase();
    const itemTokens = text.replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
    
    let intersection = 0;
    queryTokens.forEach(token => {
      if (text.includes(token)) {
        intersection++;
      }
    });

    const score = queryTokens.size > 0 ? intersection / queryTokens.size : 0;
    
    return { item, rerankScore: score };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * handleChatMessage: Orchestrates the production-grade RAG and Tool loop.
 * 1. Checks semantic cache in Qdrant. If hit (score >= 0.95), streams response instantly.
 * 2. Runs Intent Classifier to route query (product_search, policy_faq, order_status, chit_chat).
 * 3. Extracts filters and executes progressive filter relaxation query retries.
 * 4. Runs single-pass Cross-Encoder reranker.
 * 5. Handles NO_MATCH threshold checks and logs gaps.
 * 6. Performs business-rule scoring (ratings & stock boosts).
 * 7. Invokes GPT-4o tool-calling and streams SSE responses.
 * 8. Writes final answers back to semantic cache.
 */
export const handleChatMessage = async (req, res) => {
  let { message, conversationId, userId = 'guest' } = req.body;

  if (req.user && req.user.id) {
    userId = req.user.id;
  }

  if (!conversationId) {
    conversationId = uuidv4();
  }

  try {
    // A. Setup SSE Headers immediately
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'session', conversationId })}\n\n`);

    // B. Search Semantic Cache in Qdrant
    let queryVector;
    try {
      queryVector = await OpenAiService.getEmbedding(message);
      const cacheMatches = await qdrantClient.search('novawear_cache', {
        vector: queryVector,
        limit: 1,
        with_payload: true
      });
      
      if (cacheMatches.length > 0 && cacheMatches[0].score >= 0.95) {
        console.log(`Semantic cache HIT (score: ${cacheMatches[0].score.toFixed(2)})`);
        res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: cacheMatches[0].payload.response })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (cacheErr) {
      console.warn('Semantic Cache check skipped/failed:', cacheErr.message);
    }

    // 1. Intent Classifier Router
    console.log('Routing intent...');
    const routingPrompt = [
      {
        role: 'system',
        content: `You are an AI router for a retail clothing store. Your job is to classify the user's query into exactly one of the following categories:
- 'product_search': searching for products, asking for style catalog suggestions, looking for jackets, t-shirts, sizing options, colors, price check.
- 'policy_faq': asking about shipping times, refund policies, return window guidelines, washing instructions, or general FAQ manual details.
- 'order_status': tracking packages, querying order numbers, checking shipment tracking.
- 'chit_chat': simple greetings, small talk, off-topic questions, or general conversations.

Output ONLY a JSON object: {"intent": "category_name"}`
      },
      { role: 'user', content: message }
    ];
    
    let intent = 'chit_chat';
    try {
      const routeRes = await OpenAiService.chatCompletion(routingPrompt, {
        response_format: { type: 'json_object' }
      });
      intent = JSON.parse(routeRes.choices[0].message.content).intent;
      console.log(`Routed query intent: ${intent}`);
    } catch (routeErr) {
      console.warn('Routing failed, defaulting to chit_chat', routeErr.message);
    }

    // Load conversation history from MongoDB
    let conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      conversation = await Conversation.create({
        conversationId,
        userId,
        messages: [],
        summary: 'New Customer Chat'
      });
    }

    // Load active customer profile context and first name
    let customerContext = '';
    let customerName = 'customer';
    if (userId && userId !== 'guest') {
      try {
        const user = await User.findById(userId);
        if (user) {
          customerName = user.name.split(' ')[0];
          customerContext = `
ACTIVE CUSTOMER PROFILE INFO:
- Name: ${user.name}
- Email: ${user.email}
- Preferences: Size: ${user.preferences?.size || 'N/A'}, Favorite Color: ${user.preferences?.color || 'N/A'}, Category: ${user.preferences?.category || 'N/A'}, Budget: Under $${user.preferences?.budget || 'N/A'}
Use this profile to guide Recommendations when they don't specify size/color preferences.`;
        }
      } catch (e) {
        console.error('Failed to load user profile context', e);
      }
    }

    // 2. Execute Intent Specific Retrieval & Search Paths
    let contextText = '';
    let retrievedProducts = [];
    let isNoMatchTriggered = false;

    if (intent === 'policy_faq') {
      // Run Hybrid RAG Search
      const ragContexts = await RagService.retrieveRelevantContext(message, 6);
      
      if (ragContexts.length === 0) {
        isNoMatchTriggered = true;
      } else {
        // Rerank using local cross-encoder
        const reranked = localCrossEncoderRerank(message, ragContexts, item => item.text);
        
        // NO_MATCH Floor Check (at least 30% overlap match)
        if (reranked[0].rerankScore < 0.30) {
          isNoMatchTriggered = true;
        } else {
          // Take top 4 reranked chunks
          contextText = reranked.slice(0, 4).map(r => 
            `[Doc Reference: ${r.item.fileName}] (Relevance Score: ${(r.rerankScore * 100).toFixed(1)}%):\n${r.item.text}`
          ).join('\n\n');
        }
      }
    } else if (intent === 'product_search') {
      // Extract structured constraints
      console.log('Extracting query constraints...');
      const filterPrompt = [
        {
          role: 'system',
          content: `Extract filters from the clothing query. Categories allowed: T-Shirts, Shirts, Jeans, Hoodies, Jackets, Activewear, Shoes, Accessories. Colors allowed: White, Black, Grey, Charcoal, Sage, Olive, Sand, Navy, Burgundy, Mustard, Forest, Chocolate. Sizes allowed: XS, S, M, L, XL, XXL, 30, 32, 34, 36, 38, 8, 9, 10, 11, 12.
Output ONLY a JSON object: {"category": "category_name_or_null", "color": "color_name_or_null", "size": "size_name_or_null", "priceMax": number_or_null}`
        },
        { role: 'user', content: message }
      ];
      
      let filters = { category: null, color: null, size: null, priceMax: null };
      try {
        const filterRes = await OpenAiService.chatCompletion(filterPrompt, {
          response_format: { type: 'json_object' }
        });
        filters = JSON.parse(filterRes.choices[0].message.content);
        console.log('Extracted constraints:', filters);
      } catch (fErr) {
        console.warn('Filters extraction failed:', fErr.message);
      }

      // Progressive Filter Relaxation Loop inside Qdrant search
      let qdrantResults = [];
      const querySparse = generateSparseVector(message);
      
      for (let level = 0; level <= 4; level++) {
        const filterConditions = [];
        
        if (level < 4 && filters.category) {
          filterConditions.push({ key: 'category', match: { value: filters.category } });
        }
        if (level < 3 && filters.size) {
          filterConditions.push({ key: 'sizes', match: { value: filters.size } });
        }
        if (level < 2 && filters.color) {
          filterConditions.push({ key: 'colors', match: { value: filters.color } });
        }
        if (level < 1 && filters.priceMax) {
          filterConditions.push({ key: 'price', range: { lte: filters.priceMax } });
        }

        const queryFilter = filterConditions.length > 0 ? { must: filterConditions } : undefined;

        try {
          // Perform parallel hybrid searches on product catalog
          const denseSearch = qdrantClient.search('novawear_products', {
            vector: { name: 'dense', vector: queryVector },
            filter: queryFilter,
            limit: 10,
            with_payload: true
          });
          const sparseSearch = qdrantClient.search('novawear_products', {
            vector: { name: 'sparse', vector: querySparse },
            filter: queryFilter,
            limit: 10,
            with_payload: true
          });
          
          const [denseRes, sparseRes] = await Promise.all([denseSearch, sparseSearch]);
          
          // Fusion using RRF
          const rrfScores = {};
          const payloadMap = {};
          
          const computeRRF = (results) => {
            results.forEach((match, index) => {
              const id = match.id;
              const rank = index + 1;
              rrfScores[id] = (rrfScores[id] || 0) + (1 / (60 + rank));
              if (!payloadMap[id]) {
                payloadMap[id] = match;
              }
            });
          };

          computeRRF(denseRes);
          computeRRF(sparseRes);

          const sortedIds = Object.keys(rrfScores).sort((a, b) => rrfScores[b] - rrfScores[a]);
          qdrantResults = sortedIds.map(id => payloadMap[id]);

          if (qdrantResults.length >= 3) {
            console.log(`Qdrant filter relaxation level ${level} yielded ${qdrantResults.length} product candidates.`);
            break;
          }
        } catch (qErr) {
          console.error('Qdrant products search failed in relaxation loop:', qErr.message);
          break;
        }
      }

      // Check product similarity floor score (Cosine score of the top vector candidate)
      if (qdrantResults.length === 0 || qdrantResults[0].score < 0.65) {
        isNoMatchTriggered = true;
      } else {
        // Resolve MongoDB details & apply Business Scoring formula
        const candidateProducts = [];
        for (const match of qdrantResults.slice(0, 5)) {
          const payload = match.payload;
          try {
            const prod = await Product.findById(payload.productId).lean();
            if (prod) {
              const stockLevel = prod.stock || 10;
              const rating = prod.rating || 4.0;
              const businessScore = (match.score * 0.6) + (rating * 0.08) + (stockLevel > 0 ? 0.2 : 0);
              candidateProducts.push({ prod, businessScore });
            }
          } catch (dbErr) {
            console.warn(`Failed to retrieve live details for product ID ${payload.productId}:`, dbErr.message);
          }
        }

        candidateProducts.sort((a, b) => b.businessScore - a.businessScore);
        retrievedProducts = candidateProducts.map(c => c.prod);
      }
    }

    // 3. Handle NO_MATCH Fallback Branch
    if (isNoMatchTriggered) {
      console.log('Triggered NO_MATCH fallback branch.');
      await QueryGap.create({
        query: message,
        intent: intent,
        maxSimilarityScore: 0
      });
      
      const fallbackResponse = `I apologize, ${customerName}, but I couldn't find any specific store policies or items matching your search details at the moment. Could you clarify your preference or ask about a different product category?`;
      
      res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: fallbackResponse })}\n\n`);
      
      // Save fallback response to MongoDB conversation log
      conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
      conversation.messages.push({ role: 'assistant', content: fallbackResponse, timestamp: new Date() });
      await conversation.save();
      
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // 4. Construct System Instruction grounded in RAG data
    let contextInstructions = '';
    if (intent === 'policy_faq' && contextText) {
      contextInstructions = `\nRETRIEVED BRAND CONTEXT:\n${contextText}`;
    } else if (intent === 'product_search' && retrievedProducts.length > 0) {
      contextInstructions = `\nRETRIEVED PRODUCTS METADATA:\n${JSON.stringify(retrievedProducts, null, 2)}`;
    }

    const systemPrompt = {
      role: 'system',
      content: `You are the official customer support AI assistant for NovaWear, a premium garments brand.
Follow these rules strictly:
1. Provide helpful, professional, and elegant customer service.
2. Ground all answers about shipping policies, returns, sizing guides, materials, care instructions, and brand details in the retrieved context below. If the context doesn't contain the answer, politely state that you don't have that information.
3. NEVER make up or invent brand policies or details not in the context.
4. DO NOT guess live product information, price, discount, colors, sizing, stock availability, or order tracking status. You MUST call the appropriate tool.
5. If products are returned by a tool, display them beautifully. Include details like price, colors, materials, sizes, and features.
6. Use markdown formatting to render products, lists, bold keywords, and headers.
${customerContext}
${contextInstructions}`
    };

    // Build conversation history array
    const conversationHistory = conversation.messages.map(msg => {
      const msgObj = { role: msg.role, content: msg.content };
      if (msg.name) msgObj.name = msg.name;
      if (msg.tool_call_id) msgObj.tool_call_id = msg.tool_call_id;
      if (msg.toolCalls && msg.toolCalls.length > 0) msgObj.tool_calls = msg.toolCalls;
      return msgObj;
    });

    const newUserMessage = { role: 'user', content: message, timestamp: new Date() };
    conversationHistory.push({ role: 'user', content: message });
    conversation.messages.push(newUserMessage);
    await conversation.save();

    // 5. Tool-calling loop: Resolve all tools before final response
    let currentRound = 0;
    const maxRounds = 5;
    let finalPayloadForStreaming = null;
    let fullMessages = [systemPrompt, ...conversationHistory];

    while (currentRound < maxRounds) {
      console.log(`Tool-calling round ${currentRound + 1}...`);
      
      const completion = await OpenAiService.chatCompletion(fullMessages, {
        tools: toolDefinitions,
        tool_choice: 'auto'
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const dbAssistantMsg = {
          role: 'assistant',
          content: responseMessage.content || null,
          toolCalls: responseMessage.tool_calls,
          timestamp: new Date()
        };
        conversation.messages.push(dbAssistantMsg);
        await conversation.save();

        fullMessages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const toolResultText = await executeTool(toolCall);
          
          const dbToolMsg = {
            role: 'tool',
            name: toolCall.function.name,
            tool_call_id: toolCall.id,
            content: toolResultText,
            timestamp: new Date()
          };
          conversation.messages.push(dbToolMsg);
          await conversation.save();

          fullMessages.push({
            role: 'tool',
            name: toolCall.function.name,
            tool_call_id: toolCall.id,
            content: toolResultText
          });
        }
        currentRound++;
      } else {
        finalPayloadForStreaming = fullMessages;
        break;
      }
    }

    if (!finalPayloadForStreaming) {
      finalPayloadForStreaming = fullMessages;
    }

    let finalContent = '';
    const stream = await OpenAiService.chatCompletionStream(finalPayloadForStreaming);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        finalContent += content;
        res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: content })}\n\n`);
      }
    }

    // Save final assistant response to MongoDB
    if (finalContent) {
      conversation.messages.push({
        role: 'assistant',
        content: finalContent,
        timestamp: new Date()
      });
      conversation.lastUpdated = new Date();
      await conversation.save();

      // Write final output back to semantic cache collection in Qdrant
      if (queryVector) {
        try {
          await qdrantClient.upsert('novawear_cache', {
            wait: true,
            points: [{
              id: uuidv4(),
              vector: queryVector,
              payload: {
                query: message,
                response: finalContent,
                cachedAt: new Date()
              }
            }]
          });
          console.log('Saved response to semantic cache.');
        } catch (cacheWriteErr) {
          console.warn('Failed to save to semantic cache:', cacheWriteErr.message);
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Chat routing error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
};

export const getConversation = async (req, res) => {
  const { conversationId } = req.params;
  try {
    const conversation = await Conversation.findOne({ conversationId }).lean();
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getConversationsList = async (req, res) => {
  const { userId } = req.query;
  try {
    const filter = userId ? { userId } : {};
    const list = await Conversation.find(filter).sort({ lastUpdated: -1 }).select('conversationId summary lastUpdated').lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomersList = async (req, res) => {
  try {
    const list = await User.find({ role: 'customer' }).limit(15).select('name email preferences').lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
