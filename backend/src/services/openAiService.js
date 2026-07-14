import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const hasApiKey = apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.trim() !== '';

let openai = null;
if (hasApiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.warn('WARNING: OPENAI_API_KEY is not configured. AI responses will be simulated.');
}

/**
 * OpenAiService: Wrapper class coordinating requests to the OpenAI API endpoints
 * including text embeddings creation, batch vectorization, and streaming chat completions.
 */
class OpenAiService {
  /**
   * Generates a 1536-dimension embedding for the given text using text-embedding-3-small.
   * Falls back to a mock embedding if API key is not present.
   * @param {string} text - The input text snippet to vectorize
   * @returns {Promise<number[]>} 1536 floating point numbers vector
   */
  static async getEmbedding(text) {
    if (!hasApiKey || !openai) {
      // Mock embedding: Generate deterministic array of 1536 numbers matching text characters
      const mockVector = new Array(1536).fill(0).map((_, i) => {
        let hash = 0;
        for (let j = 0; j < text.length; j++) {
          hash = text.charCodeAt(j) + ((hash << 5) - hash);
        }
        return Math.sin(hash + i) * 0.1;
      });
      return mockVector;
    }

    try {
      const response = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI Embedding Error:', error);
      throw error;
    }
  }

  /**
   * Generates embeddings in batch for performance.
   * Useful when seeding product catalogs or indexing parsed document chunks.
   * @param {string[]} texts - Array of text blocks to embed
   * @returns {Promise<number[][]>} Nested array of vectors
   */
  static async getEmbeddingsBatch(texts) {
    if (!hasApiKey || !openai) {
      return Promise.all(texts.map(t => this.getEmbedding(t)));
    }

    try {
      const response = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      });
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('OpenAI Batch Embeddings Error:', error);
      throw error;
    }
  }

  /**
   * Simple chat completion call (mainly for summarizations or non-streaming responses)
   * @param {object[]} messages - Chat history array containing roles and content
   * @param {object} options - Optional overrides (temperature, tool lists)
   * @returns {Promise<object>} OpenAI completion payload
   */
  static async chatCompletion(messages, options = {}) {
    if (!hasApiKey || !openai) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'OpenAI API key is missing. This is a simulated response.'
          }
        }]
      };
    }

    try {
      return await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
        messages,
        ...options
      });
    } catch (error) {
      console.error('OpenAI Chat Completion Error:', error);
      throw error;
    }
  }

  /**
   * SSE Stream response for final completions.
   * Calls OpenAI completions endpoint with streaming active and returns the stream.
   * Falls back to a mock streaming generator if the API key is not configured.
   * @param {object[]} messages - Chat history array containing roles and content
   * @param {object} options - Optional overrides (temperature, tool lists)
   * @returns {Promise<object>} Readable Async Generator stream
   */
  static async chatCompletionStream(messages, options = {}) {
    if (!hasApiKey || !openai) {
      // Return a mock stream object that implements async iterator to simulate chat stream
      return {
        async *[Symbol.asyncIterator]() {
          const text = "Hi there! I am the NovaWear AI assistant. (OpenAI API key is not configured, so I am running in demo mode). How can I assist you with our garments brand today? You can ask me about product sizing, care instructions, shipping and return policies, or check out our catalogue!";
          const chunks = text.match(/.{1,4}/g) || [text];
          for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 50));
            yield {
              choices: [{
                delta: { content: chunk }
              }]
            };
          }
        }
      };
    }

    try {
      return await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
        messages,
        stream: true,
        ...options
      });
    } catch (error) {
      console.error('OpenAI Streaming Chat Error:', error);
      throw error;
    }
  }
}

export default OpenAiService;
