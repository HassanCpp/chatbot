import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const PRODUCTS_COLLECTION = 'novawear_products';

const run = async () => {
  try {
    const info = await qdrantClient.getCollection(PRODUCTS_COLLECTION);
    console.log('Collection info:', {
      status: info.status,
      points_count: info.points_count,
      vectors_count: info.vectors_count
    });
  } catch (err) {
    console.error('Error fetching collection info:', err.message);
  }
};

run();
