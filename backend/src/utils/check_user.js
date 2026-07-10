import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novawear';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  
  const users = await User.find({ role: 'customer' }).limit(10);
  console.log('First 10 customers in DB:');
  users.forEach((u, idx) => {
    console.log(`${idx + 1}. Name: ${u.name}, Email: ${u.email}, Password: ${u.password}, Prefs:`, u.preferences);
  });
  
  await mongoose.disconnect();
};

run();
