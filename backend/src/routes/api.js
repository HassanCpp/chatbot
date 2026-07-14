import express from 'express';
import multer from 'multer';
import { handleChatMessage, getConversation, getConversationsList, getCustomersList } from '../controllers/chatController.js';
import { registerUser, loginUser } from '../controllers/authController.js';
import { 
  seedDB, 
  uploadKnowledge, 
  listKnowledge, 
  deleteKnowledge, 
  reindexKnowledge,
  getAdminProducts,
  addAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminInventory,
  updateAdminInventory
} from '../controllers/adminController.js';
import upload from '../middlewares/uploadMiddleware.js';
import { requireAdmin, optionalAuth, chatRateLimiter } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ==========================================
// 💬 Customer Chatbot Routes
// ==========================================

// Main chatbot query endpoint (rate-limited, optionally parses logged-in JWT profile)
router.post('/chat', chatRateLimiter, optionalAuth, handleChatMessage);

// Retrieves user's session history list
router.get('/conversations', getConversationsList);

// Loads details for a specific conversation session
router.get('/conversations/:conversationId', getConversation);

// Lists demo customer accounts to helper sign-in card
router.get('/customers', getCustomersList);

// ==========================================
// 🔐 Authentication & Session Routes
// ==========================================
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// ==========================================
// 👑 Admin Dashboard RAG Document Operations (Protected by requireAdmin)
// ==========================================

// Populates MongoDB Atlas and Qdrant collections with seed items
router.post('/admin/seed', requireAdmin, seedDB);

// Handles uploading up to 30 policy manuals (PDF/Word/Text) securely wrapped in Multer error catches
router.post('/admin/knowledge/upload', requireAdmin, (req, res, next) => {
  upload.array('files', 30)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadKnowledge);

// Lists currently loaded vector documents
router.get('/admin/knowledge/list', requireAdmin, listKnowledge);

// Deletes a specific document from DB and Qdrant
router.delete('/admin/knowledge/delete/:id', requireAdmin, deleteKnowledge);

// Forces parsing and rebuilding vector collections
router.post('/admin/knowledge/reindex', requireAdmin, reindexKnowledge);

// ==========================================
// 📦 Admin Warehouse Product & Inventory Operations (Write is admin-only)
// ==========================================
router.get('/admin/products', getAdminProducts);
router.post('/admin/products', requireAdmin, addAdminProduct);
router.put('/admin/products/:id', requireAdmin, updateAdminProduct);
router.delete('/admin/products/:id', requireAdmin, deleteAdminProduct);
router.get('/admin/inventory', requireAdmin, getAdminInventory);
router.put('/admin/inventory/:id', requireAdmin, updateAdminInventory);

export default router;
