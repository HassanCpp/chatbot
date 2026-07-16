import mongoose from 'mongoose';

const uploadedKnowledgeSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true }, // in bytes
  fileType: { type: String, required: true }, // e.g. 'application/pdf', 'text/markdown'
  fileHash: { type: String },
  chunkCount: { type: Number, default: 0 },
  qdrantIds: [{ type: String }], // Vector IDs associated with this file in Qdrant
  indexed: { type: Boolean, default: false },
  indexedAt: { type: Date }
}, {
  timestamps: true
});

const UploadedKnowledge = mongoose.model('UploadedKnowledge', uploadedKnowledgeSchema);
export default UploadedKnowledge;
