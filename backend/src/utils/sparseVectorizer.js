/**
 * Generates a sparse vector representation (indices and values) for a given text segment.
 * Splits text, normalizes tokens, removes common stop words, maps words to a unique 
 * numeric index hash space (1 to 100,000), and calculates normalized term frequency weights.
 * This acts as a client-side BM25/TF-IDF generator for Qdrant's sparse vector indexing.
 * 
 * @param {string} text - Raw input string to vectorize
 * @returns {object} Sparse vector representation: { indices: number[], values: number[] }
 */
export function generateSparseVector(text) {
  if (!text) return { indices: [], values: [] };

  // Normalize, strip non-alphanumeric (keep spaces), lowercase, and tokenize
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2); // Filter out extremely short words/noises

  // Standard stop words to prevent noise indexing
  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'did', 'do', 'does', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'just', 'me', 'more',
    'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  const filteredTokens = tokens.filter(t => !stopWords.has(t));

  if (filteredTokens.length === 0) {
    return { indices: [], values: [] };
  }

  // Count term frequencies
  const termCounts = {};
  filteredTokens.forEach(token => {
    termCounts[token] = (termCounts[token] || 0) + 1;
  });

  const termScores = [];
  
  Object.entries(termCounts).forEach(([token, count]) => {
    // FNV-1a Hash function to map token to a unique numeric index in [1, 100000]
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const index = Math.abs(hash % 100000) + 1;
    
    // Normalized term frequency weight: count / total length
    const weight = count / filteredTokens.length;
    
    termScores.push({ index, weight });
  });

  // Qdrant sparse vectors require indices to be sorted in ascending order
  termScores.sort((a, b) => a.index - b.index);

  const indices = [];
  const values = [];
  
  // Dedup indices in case of hash collisions
  termScores.forEach(item => {
    if (indices.length === 0 || indices[indices.length - 1] !== item.index) {
      indices.push(item.index);
      values.push(parseFloat(item.weight.toFixed(5)));
    }
  });

  return { indices, values };
}
