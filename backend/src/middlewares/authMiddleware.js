import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_novawear_key_2026_98821';

/**
 * Rate Limiter Middleware: Prevents spam requests on chat endpoints
 * to preserve OpenAI API and Qdrant database resources.
 * Limits each IP address to 30 requests per minute.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many queries from this connection. Please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * requireAdmin Middleware: Restricts access to routes to Admin accounts only.
 * Extracts, decodes, and cryptographically verifies the bearer JWT token.
 */
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

/**
 * optionalAuth Middleware: Extracts profile context from the JWT token if present.
 * Allows guest users to continue chatting normally if they are not logged in.
 */
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
