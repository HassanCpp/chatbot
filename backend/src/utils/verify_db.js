import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { COLLECTION_NAME } from '../config/qdrant.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novawear';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

async function verify() {
  console.log('--- NovaWear Connection Diagnostics ---');
  
  // 1. MongoDB Check
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connection successful.');
    
    // Check Collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`MongoDB Collections found (${collections.length}):`);
    collections.forEach(c => console.log(`  - ${c.name}`));
  } catch (err) {
    console.error('❌ MongoDB Connection failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }

  // 2. Qdrant Check
  try {
    console.log(`Connecting to Qdrant at: ${QDRANT_URL}...`);
    const qClient = new QdrantClient({ url: QDRANT_URL });
    const cols = await qClient.getCollections();
    console.log('✅ Qdrant connection successful.');
    console.log('Qdrant Collections found:', cols.collections.map(c => c.name));
    
    const exists = cols.collections.some(c => c.name === COLLECTION_NAME);
    if (exists) {
      const info = await qClient.getCollection(COLLECTION_NAME);
      console.log(`  - Collection "${COLLECTION_NAME}": vectors size = ${info.config.params.vectors.size}, distance = ${info.config.params.vectors.distance}`);
    } else {
      console.log(`  - Collection "${COLLECTION_NAME}" not found. It will be initialized on first run.`);
    }
  } catch (err) {
    console.error('❌ Qdrant Connection failed:', err.message);
  }

  // 3. OpenAI key check
  const api_key = process.env.OPENAI_API_KEY;
  if (!api_key || api_key === 'your_openai_api_key_here') {
    console.log('⚠️ OpenAI API Key is missing or default. Running in mock demonstration mode.');
  } else {
    console.log('✅ OpenAI API Key configured.');
  }
}

verify();
