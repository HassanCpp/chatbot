import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import Product from '../models/Product.js';
import OpenAiService from '../services/openAiService.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novawear';
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});
const PRODUCTS_COLLECTION = 'novawear_products';

const mongoToUuid = (mongoId) => {
  const hex = '00000000' + mongoId.toString(); // Padded to 32 hex chars
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  console.log(`Total products in MongoDB: ${products.length}`);

  // Fetch Qdrant collection info
  const info = await qdrantClient.getCollection(PRODUCTS_COLLECTION);
  const currentCount = info.points_count;
  console.log(`Current points count in Qdrant: ${currentCount}`);

  if (currentCount >= products.length) {
    console.log('Product catalog is already fully indexed in Qdrant!');
    await mongoose.disconnect();
    return;
  }

  // We start vectorizing from currentCount up to total products
  const remainingProducts = products.slice(currentCount);
  console.log(`Vectorizing remaining ${remainingProducts.length} products...`);

  const batchSize = 100;
  for (let i = 0; i < remainingProducts.length; i += batchSize) {
    const productSlice = remainingProducts.slice(i, i + batchSize);
    
    const textBlocks = productSlice.map(p => {
      return `${p.name} (SKU: ${p.sku}) - ${p.category} > ${p.subCategory}. ` +
             `Material: ${p.material}. Fit: ${p.fit}. Fabric type: ${p.fabricType} with ${p.gsm} GSM. ` +
             `Description: ${p.description} Colors available: ${p.colors.join(', ')}. ` +
             `Sizes: ${p.sizes.join(', ')}. Season: ${p.season}. Occasion: ${p.occasion.join(', ')}. ` +
             `Tags: ${p.tags.join(', ')}.`;
    });

    const embeddings = await OpenAiService.getEmbeddingsBatch(textBlocks);

    const points = productSlice.map((p, idx) => {
      const pointId = mongoToUuid(p._id);
      return {
        id: pointId,
        vector: embeddings[idx],
        payload: {
          productId: p._id.toString(),
          sku: p.sku,
          name: p.name,
          price: p.price,
          category: p.category,
          subCategory: p.subCategory,
          material: p.material,
          colors: p.colors,
          sizes: p.sizes,
          description: p.description,
          image: p.image
        }
      };
    });

    await qdrantClient.upsert(PRODUCTS_COLLECTION, {
      wait: true,
      points: points
    });

    console.log(`Indexed products ${currentCount + i + productSlice.length}/${products.length}...`);
  }

  console.log('✅ Semantic Product Vector catalog index is now 100% complete in Qdrant.');
  await mongoose.disconnect();
};

run().catch(console.error);
