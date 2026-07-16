import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;

/**
 * REST Client Instance for communicating with Qdrant Vector database
 * (Local or Qdrant Cloud hosted clusters).
 */
export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey
});

// Semantic Vector Collection names
export const COLLECTION_NAME = 'novawear_knowledge';
export const PRODUCTS_COLLECTION = 'novawear_products';
export const CACHE_COLLECTION = 'novawear_cache';

/**
 * Vector Store Collection Initializer:
 * Validates, checks, and creates Qdrant collections if they do not exist.
 * Standardizes vector size to 1536 dimensions using Cosine distance (fits text-embedding-3-small).
 */
export const initQdrant = async () => {
  try {
    const collections = await qdrantClient.getCollections();
    
    const ensureCollection = async (name, enableSparse) => {
      const exists = collections.collections.some(c => c.name === name);
      let recreate = false;
      
      if (exists) {
        try {
          const info = await qdrantClient.getCollection(name);
          const params = info.config?.params || {};
          
          if (enableSparse) {
            // Check if collection has named dense vector 'dense' and sparse vector 'sparse'
            const hasDenseName = params.vectors && params.vectors.dense;
            const hasSparse = params.sparse_vectors && params.sparse_vectors.sparse;
            if (!hasDenseName || !hasSparse) {
              console.log(`Collection ${name} has outdated structure. Recreating for hybrid search...`);
              await qdrantClient.deleteCollection(name);
              recreate = true;
            }
          }
        } catch (e) {
          console.warn(`Error checking collection ${name}:`, e.message);
          recreate = true;
        }
      } else {
        recreate = true;
      }

      if (recreate) {
        if (enableSparse) {
          console.log(`Creating Qdrant hybrid collection: ${name}...`);
          await qdrantClient.createCollection(name, {
            vectors: {
              dense: {
                size: 1536,
                distance: 'Cosine'
              }
            },
            sparse_vectors: {
              sparse: {}
            }
          });
          console.log(`Created Qdrant hybrid collection: ${name} successfully.`);
        } else {
          console.log(`Creating Qdrant cache collection: ${name}...`);
          await qdrantClient.createCollection(name, {
            vectors: { size: 1536, distance: 'Cosine' }
          });
          console.log(`Created Qdrant cache collection: ${name} successfully.`);
        }
      } else {
        console.log(`Qdrant collection ${name} already exists and is valid.`);
      }
    };

    await ensureCollection(COLLECTION_NAME, true);
    await ensureCollection(PRODUCTS_COLLECTION, true);
    await ensureCollection(CACHE_COLLECTION, false);

  } catch (error) {
    console.error(`Qdrant Connection/Initialization Error: ${error.message}`);
    console.warn(`WARNING: Qdrant service is either offline or unreachable at ${qdrantUrl}. RAG/Product Search vectors will be bypassed dynamically.`);
  }
};
