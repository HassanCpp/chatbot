import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Serverless check: Vercel functions have a read-only root system.
// We redirect temporary uploads to `/tmp` (which is writeable) when deployed on Vercel.
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp' : 'uploads/';

if (!isVercel && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configure Multer Storage Engine:
 * Saves files either in local uploads/ folder or Vercel serverless /tmp folder
 * appending a unique timestamp suffix to avoid filename collisions.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

/**
 * File Validation Filter:
 * Ensures only specific documents (.pdf, .docx, .txt, .md) are processed.
 */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed formats: PDF, DOCX, TXT, MD. Received extension: ${ext}`), false);
  }
};

/**
 * Multer Instance export:
 * Applies storage, file filter, and restricts file size to 5MB to prevent memory bloats.
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default upload;
