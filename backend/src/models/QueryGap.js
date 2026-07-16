import mongoose from 'mongoose';

/**
 * QueryGapSchema: Records search queries that yielded zero results 
 * or failed below the minimum similarity threshold.
 * Helps administrators identify missing brand documentation or product catalog gaps.
 */
const queryGapSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true
  },
  intent: {
    type: String,
    enum: ['product_search', 'policy_faq'],
    required: true
  },
  maxSimilarityScore: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const QueryGap = mongoose.model('QueryGap', queryGapSchema);
export default QueryGap;
