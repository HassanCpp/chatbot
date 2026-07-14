import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

/**
 * DNS Server Override: Force Node.js to use public DNS servers (Cloudflare/Google)
 * to resolve SRV records on environments that block standard DNS resolution.
 */
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

/**
 * Establishes connection to the MongoDB database (Local or Atlas Cloud)
 * using the configured URI string. Exits process immediately upon failure.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
