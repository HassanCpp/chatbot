import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../models/User.js';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const email = 'hassanwaqar475@gmail.com';
  const targetPassword = 'password123';
  const newHash = hashPassword(targetPassword);

  const user = await User.findOne({ email });

  if (!user) {
    console.log(`User with email "${email}" not found! Creating one...`);
    const newUser = await User.create({
      name: 'hassan',
      email: email,
      password: newHash,
      role: 'admin',
      preferences: {
        size: 'M',
        color: 'Midnight Black',
        category: 'T-Shirts',
        budget: 80
      }
    });
    console.log(`Created new Admin user: "${newUser.name}" (${email}) with password "${targetPassword}"`);
  } else {
    user.password = newHash;
    user.role = 'admin'; // just to make absolutely sure
    await user.save();
    console.log(`Updated user "${user.name}" (${email}) password to "${targetPassword}"`);
  }

  await mongoose.disconnect();
};

run().catch(console.error);
