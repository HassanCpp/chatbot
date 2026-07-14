import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initQdrant } from './config/qdrant.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * CORS Middleware Configuration:
 * Express server configurations allowing secure pre-flight OPTIONS checks
 * and cross-origin Authorization headers mapping from browsers.
 */
app.use(cors({
  origin: '*', // Allow all origins for local dev convenience
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role']
}));

// Body Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (if any thumbnail uploads are saved in backend)
app.use('/uploads', express.static('uploads'));

/**
 * API Root Welcome Handler:
 * Displays active service description metadata to browser.
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the NovaWear AI Customer Support API.',
    status: 'online',
    healthCheck: '/api/health'
  });
});

/**
 * Health Check Endpoint:
 * Invoked by client dashboard UI to check server online health status.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    service: 'NovaWear Customer Support Engine'
  });
});

// Register API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

/**
 * Server Initializer:
 * Connects to MongoDB, sets up Qdrant collections, and boots express listeners.
 */
const startServer = async () => {
  console.log('Connecting to database...');
  await connectDB();
  
  console.log('Initializing Vector store...');
  await initQdrant();

  app.listen(PORT, () => {
    console.log(`NovaWear Server is running in active mode on port ${PORT}`);
  });
};

startServer();
