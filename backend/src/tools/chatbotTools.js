import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Conversation from '../models/Conversation.js';
import Category from '../models/Category.js';

/**
 * toolDefinitions: Describes functions available for GPT-4o to execute.
 * Tells the LLM which database fields and operations are accessible dynamically.
 */
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search for NovaWear clothing products using keywords, category, gender, and tags.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term for name, description, tags, e.g. "oversized t-shirt", "winter jacket"' },
          gender: { type: 'string', enum: ['Men', 'Women', 'Unisex'], description: 'Filter by gender' },
          category: { type: 'string', description: 'Filter by category name, e.g. "Tops", "Bottoms"' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductById',
      description: 'Retrieve details for a specific product using its MongoDB Object ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The MongoDB ObjectId of the product' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductBySKU',
      description: 'Retrieve details for a specific garment using its unique SKU code.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Garment SKU, e.g. "NW-TS-BLK-01"' }
        },
        required: ['sku']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchByCategory',
      description: 'Search products within a specific category or subcategory.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'The category to filter by (e.g. Tops, Bottoms, Outerwear)' },
          subCategory: { type: 'string', description: 'The subcategory (e.g. T-Shirts, Hoodies, Jeans)' }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchByPrice',
      description: 'Search products within a specified price budget range.',
      parameters: {
        type: 'object',
        properties: {
          priceMin: { type: 'number', description: 'Minimum price in USD' },
          priceMax: { type: 'number', description: 'Maximum price in USD' }
        },
        required: ['priceMax']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchByMaterial',
      description: 'Search for clothes based on material and fabric characteristics (e.g., Organic Cotton, Linen, Denim).',
      parameters: {
        type: 'object',
        properties: {
          material: { type: 'string', description: 'The material name, e.g. "Cotton", "Linen", "Polyester"' }
        },
        required: ['material']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchByColor',
      description: 'Search products that are available in a specific color.',
      parameters: {
        type: 'object',
        properties: {
          color: { type: 'string', description: 'Color name, e.g. "Black", "Off-White", "Olive"' }
        },
        required: ['color']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchBySize',
      description: 'Search products that are available in a specific garment size.',
      parameters: {
        type: 'object',
        properties: {
          size: { type: 'string', description: 'Garment size: S, M, L, XL, etc.' }
        },
        required: ['size']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkStock',
      description: 'Check inventory availability and reserved stock logs for a product SKU or ID.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU of the product' },
          productId: { type: 'string', description: 'ObjectId of the product (optional if SKU is provided)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recommendProducts',
      description: 'Recommend products based on style preferences, occasion, season, weather, or budget.',
      parameters: {
        type: 'object',
        properties: {
          budget: { type: 'number', description: 'Maximum budget for recommendation' },
          color: { type: 'string', description: 'Preferred color' },
          size: { type: 'string', description: 'Preferred size' },
          material: { type: 'string', description: 'Preferred material type' },
          fit: { type: 'string', description: 'Preferred clothing fit, e.g., Oversized, Slim Fit, Regular' },
          season: { type: 'string', description: 'Filter by season, e.g., Fall/Winter, Spring/Summer' },
          occasion: { type: 'string', description: 'Filter by occasion/style, e.g., Casual, Streetwear, Formal, Loungewear' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getOrder',
      description: 'Retrieve order summary details for a specific order ID.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID, e.g., "NW-1002"' }
        },
        required: ['orderId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'trackOrder',
      description: 'Retrieve shipping tracking status and carrier details for an order.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID, e.g., "NW-1002"' }
        },
        required: ['orderId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveConversation',
      description: 'Save or update the current chat history metadata and generate summary.',
      parameters: {
        type: 'object',
        properties: {
          conversationId: { type: 'string', description: 'The current conversation session ID' },
          summary: { type: 'string', description: 'A short 1-sentence summary of what the customer is looking for' }
        },
        required: ['conversationId', 'summary']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'loadConversation',
      description: 'Load a saved chat history session by its conversation ID.',
      parameters: {
        type: 'object',
        properties: {
          conversationId: { type: 'string', description: 'The unique conversation ID' }
        },
        required: ['conversationId']
      }
    }
  }
];

/**
 * toolExecutors: Key-value map of actual asynchronous database queries
 * triggered when GPT-4o requests dynamic tool executions.
 */
export const toolExecutors = {
  searchProducts: async ({ query, gender, category }) => {
    let filter = {};
    if (gender) filter.gender = gender;
    if (category) filter.category = new RegExp(category, 'i');
    
    if (query) {
      // Simple text search regex fallback + index search
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }
    
    const results = await Product.find(filter).limit(10).lean();
    return JSON.stringify(results);
  },

  getProductById: async ({ id }) => {
    const result = await Product.findById(id).lean();
    return JSON.stringify(result || { error: 'Product not found' });
  },

  getProductBySKU: async ({ sku }) => {
    const result = await Product.findOne({ sku: sku.toUpperCase() }).lean();
    return JSON.stringify(result || { error: 'Product not found' });
  },

  searchByCategory: async ({ category, subCategory }) => {
    let filter = { category: new RegExp(category, 'i') };
    if (subCategory) filter.subCategory = new RegExp(subCategory, 'i');
    const results = await Product.find(filter).limit(10).lean();
    return JSON.stringify(results);
  },

  searchByPrice: async ({ priceMin = 0, priceMax }) => {
    const results = await Product.find({
      price: { $gte: priceMin, $lte: priceMax }
    }).limit(10).lean();
    return JSON.stringify(results);
  },

  searchByMaterial: async ({ material }) => {
    const results = await Product.find({
      material: new RegExp(material, 'i')
    }).limit(10).lean();
    return JSON.stringify(results);
  },

  searchByColor: async ({ color }) => {
    const results = await Product.find({
      colors: { $in: [new RegExp(color, 'i')] }
    }).limit(10).lean();
    return JSON.stringify(results);
  },

  searchBySize: async ({ size }) => {
    const results = await Product.find({
      sizes: { $in: [new RegExp(`^${size}$`, 'i')] }
    }).limit(10).lean();
    return JSON.stringify(results);
  },

  checkStock: async ({ sku, productId }) => {
    let query = {};
    if (productId) query._id = productId;
    else if (sku) query.sku = sku.toUpperCase();
    else return JSON.stringify({ error: 'Provide either sku or productId' });

    const product = await Product.findOne(query).select('sku name stock reservedStock').lean();
    if (!product) return JSON.stringify({ error: 'Product not found' });
    
    return JSON.stringify({
      sku: product.sku,
      name: product.name,
      availableStock: product.stock - product.reservedStock,
      totalStock: product.stock,
      reservedStock: product.reservedStock,
      inStock: (product.stock - product.reservedStock) > 0
    });
  },

  recommendProducts: async ({ budget, color, size, material, fit, season, occasion }) => {
    let filter = {};
    
    if (budget) filter.price = { $lte: budget };
    if (color) filter.colors = { $in: [new RegExp(color, 'i')] };
    if (size) filter.sizes = { $in: [new RegExp(`^${size}$`, 'i')] };
    if (material) filter.material = new RegExp(material, 'i');
    if (fit) filter.fit = new RegExp(fit, 'i');
    if (season) filter.season = new RegExp(season, 'i');
    if (occasion) filter.occasion = { $in: [new RegExp(occasion, 'i')] };

    // Find and return matching products, sorted by rating desc
    const results = await Product.find(filter).sort({ rating: -1 }).limit(6).lean();
    
    if (results.length === 0) {
      // Fallback: search products in same budget and return best rated
      const fallbackFilter = budget ? { price: { $lte: budget } } : {};
      const fallbacks = await Product.find(fallbackFilter).sort({ rating: -1 }).limit(4).lean();
      return JSON.stringify({
        message: 'No exact matches found, here are some alternatives matching your budget:',
        products: fallbacks
      });
    }

    return JSON.stringify({ products: results });
  },

  getOrder: async ({ orderId }) => {
    const order = await Order.findOne({ orderId: orderId.toUpperCase() }).lean();
    return JSON.stringify(order || { error: `Order ${orderId} not found` });
  },

  trackOrder: async ({ orderId }) => {
    const order = await Order.findOne({ orderId: orderId.toUpperCase() }).select('orderId status trackingNumber carrier estimatedDelivery').lean();
    if (!order) return JSON.stringify({ error: `Order ${orderId} not found` });
    return JSON.stringify(order);
  },

  saveConversation: async ({ conversationId, summary }) => {
    const conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      conversation.summary = summary;
      conversation.lastUpdated = new Date();
      await conversation.save();
      return JSON.stringify({ success: true, message: 'Conversation summary saved' });
    }
    return JSON.stringify({ error: 'Conversation session not found' });
  },

  loadConversation: async ({ conversationId }) => {
    const conversation = await Conversation.findOne({ conversationId }).lean();
    return JSON.stringify(conversation || { error: 'Conversation session not found' });
  }
};

/**
 * Main engine handler to execute a tool function call requested by OpenAI GPT.
 * Parses the arguments string and runs the mapped executor.
 * @param {object} toolCall - The tool call payload block from OpenAI
 * @returns {Promise<string>} JSON string result of database operation
 */
export const executeTool = async (toolCall) => {
  const { name, arguments: argsString } = toolCall.function;
  console.log(`Executing tool: ${name} with args:`, argsString);
  
  let args = {};
  try {
    args = JSON.parse(argsString);
  } catch (e) {
    console.error(`Error parsing arguments for tool ${name}:`, e.message);
  }

  const executor = toolExecutors[name];
  if (!executor) {
    console.error(`Tool executor for ${name} not found.`);
    return JSON.stringify({ error: `Tool ${name} is not implemented` });
  }

  try {
    const result = await executor(args);
    return result;
  } catch (err) {
    console.error(`Error running tool ${name}:`, err.message);
    return JSON.stringify({ error: `Internal tool execution error: ${err.message}` });
  }
};
