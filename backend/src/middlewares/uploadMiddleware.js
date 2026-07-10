import multer from 'multer';
import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp' : 'uploads/';

if (!isVercel && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save with unique timestamp to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter check for PDF, DOCX, TXT, Markdown
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed formats: PDF, DOCX, TXT, MD. Received extension: ${ext}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default upload;
