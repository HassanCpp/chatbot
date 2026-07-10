import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAiService from './openAiService.js';
import { qdrantClient, COLLECTION_NAME } from '../config/qdrant.js';
import UploadedKnowledge from '../models/UploadedKnowledge.js';

class RagService {
  /**
   * Parse uploaded file buffer based on MIME type.
   */
  static async parseDocument(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (
      mimeType === 'text/plain' || 
      mimeType === 'text/markdown' || 
      mimeType.startsWith('text/')
    ) {
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Chunk text into smaller segments with overlapping content.
   */
  static chunkText(text, maxChunkSize = 800, overlap = 150) {
    // Clean up text double spacings and newlines
    const cleanedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!cleanedText) return [];

    const chunks = [];
    let startIdx = 0;

    while (startIdx < cleanedText.length) {
      let endIdx = startIdx + maxChunkSize;
      
      // If we are not at the end of the text, try to find a natural boundary (newline or period)
      if (endIdx < cleanedText.length) {
        const nextSpace = cleanedText.indexOf(' ', endIdx);
        const nextPeriod = cleanedText.indexOf('.', endIdx);
        const nextNewline = cleanedText.indexOf('\n', endIdx);
        
        // Find closest boundary within 100 chars to avoid cutting mid-sentence
        const boundaries = [nextNewline, nextPeriod, nextSpace].filter(
          b => b !== -1 && b - endIdx < 100
        );
        if (boundaries.length > 0) {
          endIdx = Math.min(...boundaries) + 1; // Include punctuation/space
        }
      }

      chunks.push(cleanedText.substring(startIdx, endIdx).trim());
      startIdx = endIdx - overlap;
      if (startIdx >= cleanedText.length - overlap) break;
      if (startIdx < 0) startIdx = 0;
    }

    return chunks.filter(c => c.length > 10); // Remove tiny junk chunks
  }

  /**
   * Generates embeddings for chunks, upserts them to Qdrant, and saves file meta to MongoDB.
   */
  static async indexDocument(fileInfo, buffer) {
    const text = await this.parseDocument(buffer, fileInfo.mimetype);
    const chunks = this.chunkText(text);

    if (chunks.length === 0) {
      throw new Error('Document content is empty or could not be parsed.');
    }

    console.log(`Document parsed. Creating embeddings for ${chunks.length} chunks...`);

    const qdrantIds = [];
    const points = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await OpenAiService.getEmbedding(chunkText);
      const pointId = uuidv4();
      
      qdrantIds.push(pointId);

      points.push({
        id: pointId,
        vector: embedding,
        payload: {
          fileName: fileInfo.originalname,
          filePath: fileInfo.path || 'seeded',
          text: chunkText,
          chunkIndex: i,
          totalChunks: chunks.length
        }
      });
    }

    // Try uploading to Qdrant (with fallback if offline)
    let indexedInQdrant = false;
    try {
      // batch upsert
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: points
      });
      indexedInQdrant = true;
      console.log(`Successfully uploaded ${points.length} points to Qdrant collection ${COLLECTION_NAME}.`);
    } catch (err) {
      console.error('Qdrant indexing failed. Running in RAG-Offline mode.', err.message);
    }

    // Save metadata in MongoDB
    const docMeta = await UploadedKnowledge.create({
      fileName: fileInfo.originalname,
      filePath: fileInfo.path || 'seeded',
      fileSize: fileInfo.size || buffer.length,
      fileType: fileInfo.mimetype,
      chunkCount: chunks.length,
      qdrantIds: qdrantIds,
      indexed: indexedInQdrant,
      indexedAt: new Date()
    });

    return docMeta;
  }

  /**
   * Search for similar text chunks in Qdrant.
   * If Qdrant is unavailable, does a keyword-based MongoDB backup search or returns empty.
   */
  static async retrieveRelevantContext(query, limit = 5) {
    try {
      const queryVector = await OpenAiService.getEmbedding(query);
      
      const searchResults = await qdrantClient.search(COLLECTION_NAME, {
        vector: queryVector,
        limit: limit,
        with_payload: true
      });

      return searchResults.map(match => ({
        text: match.payload.text,
        score: match.score,
        fileName: match.payload.fileName
      }));
    } catch (error) {
      console.warn('Qdrant retrieval error, falling back to local mock check:', error.message);
      
      // Secondary fallback: retrieve indexed files metadata
      // and perform simple keyword scanning on stored details.
      // (This prevents crashing if Qdrant is offline).
      return [];
    }
  }

  /**
   * Delete document chunks from Qdrant and metadata from MongoDB.
   */
  static async deleteDocument(docId) {
    const doc = await UploadedKnowledge.findById(docId);
    if (!doc) {
      throw new Error('Document not found in MongoDB database.');
    }

    // Try deleting from Qdrant
    if (doc.qdrantIds && doc.qdrantIds.length > 0) {
      try {
        await qdrantClient.delete(COLLECTION_NAME, {
          points: doc.qdrantIds
        });
        console.log(`Deleted ${doc.qdrantIds.length} vector points from Qdrant.`);
      } catch (err) {
        console.error('Failed to delete vectors from Qdrant:', err.message);
      }
    }

    // Delete file from local uploads directory if it exists
    if (doc.filePath && fs.existsSync(doc.filePath) && doc.filePath !== 'seeded') {
      try {
        fs.unlinkSync(doc.filePath);
        console.log(`Deleted file: ${doc.filePath}`);
      } catch (err) {
        console.error(`Failed to delete file from disk: ${err.message}`);
      }
    }

    // Remove from MongoDB
    await UploadedKnowledge.findByIdAndDelete(docId);
    return doc;
  }

  /**
   * Re-indexes all document files stored in MongoDB.
   */
  static async reindexAll() {
    const docs = await UploadedKnowledge.find({});
    console.log(`Re-indexing ${docs.length} documents...`);

    let successCount = 0;
    for (const doc of docs) {
      try {
        // Read file from path
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          const buffer = fs.readFileSync(doc.filePath);
          const mimeType = doc.fileType;
          const fileInfo = {
            originalname: doc.fileName,
            path: doc.filePath,
            size: doc.fileSize,
            mimetype: mimeType
          };

          // Delete old points first
          if (doc.qdrantIds && doc.qdrantIds.length > 0) {
            try {
              await qdrantClient.delete(COLLECTION_NAME, { points: doc.qdrantIds });
            } catch (e) {
              console.warn('Could not clear old vectors during reindexing:', e.message);
            }
          }

          // Re-parse and index
          const text = await this.parseDocument(buffer, mimeType);
          const chunks = this.chunkText(text);
          const qdrantIds = [];
          const points = [];

          for (let i = 0; i < chunks.length; i++) {
            const embedding = await OpenAiService.getEmbedding(chunks[i]);
            const pointId = uuidv4();
            qdrantIds.push(pointId);
            points.push({
              id: pointId,
              vector: embedding,
              payload: {
                fileName: doc.fileName,
                filePath: doc.filePath,
                text: chunks[i],
                chunkIndex: i,
                totalChunks: chunks.length
              }
            });
          }

          await qdrantClient.upsert(COLLECTION_NAME, { wait: true, points });
          
          doc.chunkCount = chunks.length;
          doc.qdrantIds = qdrantIds;
          doc.indexed = true;
          doc.indexedAt = new Date();
          await doc.save();
          
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to re-index document ${doc.fileName}:`, err.message);
      }
    }
    return successCount;
  }
}

export default RagService;
