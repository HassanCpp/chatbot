import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const adminEmail = 'hassanwaqar475@gmail.com';

  // Find all admins in the database
  const admins = await User.find({ role: 'admin' });
  console.log(`Current admins in DB: ${admins.length}`);

  for (const user of admins) {
    if (user.email !== adminEmail) {
      user.role = 'customer';
      await user.save();
      console.log(`Demoted admin "${user.name}" (${user.email}) to "customer".`);
    } else {
      console.log(`Verified hassanwaqar475@gmail.com is an admin.`);
    }
  }

  // Ensure hassanwaqar475@gmail.com is indeed an admin
  const hassan = await User.findOne({ email: adminEmail });
  if (hassan && hassan.role !== 'admin') {
    hassan.role = 'admin';
    await hassan.save();
    console.log('Granted admin role to hassanwaqar475@gmail.com');
  }

  console.log('Admin cleanup finished successfully.');
  await mongoose.disconnect();
};

run().catch(console.error);
