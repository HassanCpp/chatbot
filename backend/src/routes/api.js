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

// Chatbot routes
router.post('/chat', chatRateLimiter, optionalAuth, handleChatMessage);
router.get('/conversations', getConversationsList);
router.get('/conversations/:conversationId', getConversation);
router.get('/customers', getCustomersList);

// Authentication routes
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// Admin dashboard routes (Protected by requireAdmin)
router.post('/admin/seed', requireAdmin, seedDB);
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
router.get('/admin/knowledge/list', requireAdmin, listKnowledge);
router.delete('/admin/knowledge/delete/:id', requireAdmin, deleteKnowledge);
router.post('/admin/knowledge/reindex', requireAdmin, reindexKnowledge);

// Admin product/inventory routes (GET is public, write is admin-only)
router.get('/admin/products', getAdminProducts);
router.post('/admin/products', requireAdmin, addAdminProduct);
router.put('/admin/products/:id', requireAdmin, updateAdminProduct);
router.delete('/admin/products/:id', requireAdmin, deleteAdminProduct);
router.get('/admin/inventory', requireAdmin, getAdminInventory);
router.put('/admin/inventory/:id', requireAdmin, updateAdminInventory);

export default router;
