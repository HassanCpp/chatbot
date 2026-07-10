import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey
});

export const COLLECTION_NAME = 'novawear_knowledge';
export const PRODUCTS_COLLECTION = 'novawear_products';

export const initQdrant = async () => {
  try {
    const collections = await qdrantClient.getCollections();
    
    // Initialize Knowledge Base Collection
    const knowledgeExists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!knowledgeExists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}...`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: 1536, distance: 'Cosine' }
      });
      console.log(`Qdrant collection ${COLLECTION_NAME} created successfully.`);
    } else {
      console.log(`Qdrant collection ${COLLECTION_NAME} already exists.`);
    }

    // Initialize Products Collection
    const productsExists = collections.collections.some(c => c.name === PRODUCTS_COLLECTION);
    if (!productsExists) {
      console.log(`Creating Qdrant collection: ${PRODUCTS_COLLECTION}...`);
      await qdrantClient.createCollection(PRODUCTS_COLLECTION, {
        vectors: { size: 1536, distance: 'Cosine' }
      });
      console.log(`Qdrant collection ${PRODUCTS_COLLECTION} created successfully.`);
    } else {
      console.log(`Qdrant collection ${PRODUCTS_COLLECTION} already exists.`);
    }
  } catch (error) {
    console.error(`Qdrant Connection/Initialization Error: ${error.message}`);
    console.warn(`WARNING: Qdrant service is either offline or unreachable at ${qdrantUrl}. RAG/Product Search vectors will be bypassed dynamically.`);
  }
};
