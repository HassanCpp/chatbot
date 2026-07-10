import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import UploadedKnowledge from '../models/UploadedKnowledge.js';
import Inventory from '../models/Inventory.js';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to:', mongoose.connection.name);
  console.log('Connection host:', mongoose.connection.host);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} documents`);
  }

  const user = await User.findOne({ email: 'hassanwaqar475@gmail.com' });
  if (user) {
    console.log('hassanwaqar475@gmail.com details:', {
      name: user.name,
      email: user.email,
      role: user.role
    });
  } else {
    console.log('hassanwaqar475@gmail.com NOT found!');
  }

  await mongoose.disconnect();
};

run().catch(console.error);
