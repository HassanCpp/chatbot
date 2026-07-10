import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_novawear_key_2026_98821';

// Rate limit customer chatbot API (Max 30 requests per minute per IP)
export const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many queries from this connection. Please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Verify JWT and require admin role
export const requireAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. Authorization token is missing or invalid.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Administrator privileges are required.'
      });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Access denied. Token verification failed.'
    });
  }
};

// Optional JWT authentication for customer chat sessions
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore invalid tokens and proceed as guest
    }
  }
  next();
};
