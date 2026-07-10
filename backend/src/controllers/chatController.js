import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import RagService from '../services/ragService.js';
import OpenAiService from '../services/openAiService.js';
import { toolDefinitions, executeTool } from '../tools/chatbotTools.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat Controller that processes customer queries, performs RAG retrieval,
 * manages OpenAI tool calling cycles, and streams the final response.
 */
export const handleChatMessage = async (req, res) => {
  let { message, conversationId, userId = 'guest' } = req.body;

  // Use authenticated user ID from JWT if present to prevent spoofing/impersonation
  if (req.user && req.user.id) {
    userId = req.user.id;
  }

  // 1. Check or generate session ID
  if (!conversationId) {
    conversationId = uuidv4();
  }

  try {
    // 2. Load previous conversation history from MongoDB
    let conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      conversation = await Conversation.create({
        conversationId,
        userId,
        messages: [],
        summary: 'New Customer Chat'
      });
    }

    // 2b. Fetch active customer profile if authenticated (non-guest)
    let customerContext = '';
    if (userId && userId !== 'guest') {
      try {
        const user = await User.findById(userId);
        if (user) {
          customerContext = `
ACTIVE CUSTOMER PROFILE INFO:
- Name: ${user.name}
- Email: ${user.email}
- Preferences: Size: ${user.preferences?.size || 'N/A'}, Favorite Color: ${user.preferences?.color || 'N/A'}, Category: ${user.preferences?.category || 'N/A'}, Budget: Under $${user.preferences?.budget || 'N/A'}
Use this profile to guide sizing or color recommendations when they don't specify them (e.g. recommend size ${user.preferences?.size || 'M'} by default, and address them by name ${user.name}).`;
        }
      } catch (e) {
        console.error('Failed to load user profile context in chatController', e);
      }
    }

    // 3. Query RAG context from Qdrant using similarity search
    const ragContexts = await RagService.retrieveRelevantContext(message, 4);
    const contextText = ragContexts
      .map(c => `[Doc Reference: ${c.fileName}] (Similarity: ${(c.score * 100).toFixed(1)}%):\n${c.text}`)
      .join('\n\n');

    // 4. Construct System Instruction grounded in RAG data
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

RETRIEVED BRAND CONTEXT:
${contextText || 'No documents retrieved. Explain that you can search the product database, but details on internal brand policies are currently unavailable.'}`
    };

    // 5. Build conversation history array
    const conversationHistory = conversation.messages.map(msg => {
      const msgObj = { role: msg.role, content: msg.content };
      if (msg.name) msgObj.name = msg.name;
      if (msg.tool_call_id) msgObj.tool_call_id = msg.tool_call_id;
      if (msg.toolCalls && msg.toolCalls.length > 0) msgObj.tool_calls = msg.toolCalls;
      return msgObj;
    });

    // Add new user message to local history and database
    const newUserMessage = { role: 'user', content: message, timestamp: new Date() };
    conversationHistory.push({ role: 'user', content: message });
    conversation.messages.push(newUserMessage);
    await conversation.save();

    // 6. Tool-calling loop: Resolve all tools before final response
    let currentRound = 0;
    const maxRounds = 5;
    let finalPayloadForStreaming = null;

    // We build the complete prompt list starting with system prompt
    let fullMessages = [systemPrompt, ...conversationHistory];

    while (currentRound < maxRounds) {
      console.log(`Tool-calling round ${currentRound + 1}...`);
      
      const completion = await OpenAiService.chatCompletion(fullMessages, {
        tools: toolDefinitions,
        tool_choice: 'auto'
      });

      const responseMessage = completion.choices[0].message;

      // If model requests tool execution, run it and append to conversation
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Save assistant tool call request to database
        const dbAssistantMsg = {
          role: 'assistant',
          content: responseMessage.content || null,
          toolCalls: responseMessage.tool_calls,
          timestamp: new Date()
        };
        conversation.messages.push(dbAssistantMsg);
        await conversation.save();

        // Push to working memory
        fullMessages.push(responseMessage);

        // Execute tool calls in parallel/sequence
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
        // No tool calls needed, this is the final message payload we want to stream!
        // We will remove the last completion choice and request it via stream to capture SSE chunks.
        finalPayloadForStreaming = fullMessages;
        break;
      }
    }

    // Default to fullMessages if loop bounds exceeded
    if (!finalPayloadForStreaming) {
      finalPayloadForStreaming = fullMessages;
    }

    // 7. Setup SSE Response Stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send session headers back
    res.write(`data: ${JSON.stringify({ type: 'session', conversationId })}\n\n`);

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
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Chat routing error:', error);
    // Send SSE formatted error so the UI can catch it nicely
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Endpoint to load a conversation session.
 */
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

/**
 * Endpoint to list all active conversations.
 */
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

/**
 * Endpoint to list first 15 standard customers.
 */
export const getCustomersList = async (req, res) => {
  try {
    const list = await User.find({ role: 'customer' }).limit(15).select('name email preferences').lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
