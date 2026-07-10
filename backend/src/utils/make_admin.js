import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novawear';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const email = 'hassanwaqar475@gmail.com';
  const user = await User.findOne({ email });

  if (!user) {
    console.log(`User with email "${email}" not found! Make sure you registered first.`);
  } else {
    user.role = 'admin';
    await user.save();
    console.log(`Successfully updated user "${user.name}" (${email}) to role: "admin"!`);
  }

  await mongoose.disconnect();
};

run().catch(console.error);
