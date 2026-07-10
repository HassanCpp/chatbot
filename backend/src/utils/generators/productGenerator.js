// Realistic Garment Product Generator for NovaWear
const CATEGORIES = {
  'T-Shirts': ['Crew neck', 'V-neck', 'Oversized', 'Athletic'],
  'Shirts': ['Formal', 'Business Casual', 'Flannel', 'Linen'],
  'Jeans': ['Slim', 'Regular', 'Relaxed', 'Straight'],
  'Hoodies': ['Pullover', 'Zip-up'],
  'Jackets': ['Bomber', 'Puffer', 'Denim', 'Softshell'],
  'Activewear': ['Performance Tops', 'Leggings', 'Running Shorts'],
  'Shoes': ['Sneakers', 'Trainers', 'Casual Shoes'],
  'Accessories': ['Caps', 'Belts', 'Socks', 'Backpacks']
};

const MATERIALS = [
  { name: '100% Organic Cotton', type: 'Knit Jersey', gsm: 240 },
  { name: '80% Organic Cotton, 20% Recycled Polyester', type: 'French Terry', gsm: 380 },
  { name: '100% Selvedge Cotton Denim', type: 'Woven Denim', gsm: 340 },
  { name: '70% Wool, 30% Alpaca Blend', type: 'Knit Woolen', gsm: 320 },
  { name: '100% Recycled Nylon Taslan', type: 'Woven Taslan Shell', gsm: 180 },
  { name: '100% European Flax Linen', type: 'Woven Linen', gsm: 160 },
  { name: '100% Recycled Polyester Mesh', type: 'Breathable Mesh', gsm: 150 },
  { name: '100% Merino Wool Yarn', type: 'Fine Rib Knit', gsm: 260 }
];

const COLORS = ['Midnight Black', 'Crisp White', 'Heather Grey', 'Charcoal', 'Sage Green', 'Olive Drab', 'Sand Beige', 'Navy Blue', 'Burgundy Red', 'Mustard Yellow', 'Forest Green', 'Chocolate Brown'];
const SIZES = {
  apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  pants: ['30', '32', '34', '36', '38'],
  shoes: ['8', '9', '10', '11', '12'],
  accessories: ['One Size']
};

const FITS = ['Oversized Fit', 'Regular Fit', 'Slim Fit', 'Relaxed Straight Fit', 'Boxy Casual'];
const OCCASIONS = ['Casual', 'Streetwear', 'Everyday', 'Loungewear', 'Smart Casual', 'Outdoors', 'Athletic', 'Night Out'];
const GENDERS = ['Men', 'Women', 'Unisex'];
const COLLECTIONS = [
  'Spring Essentials',
  'Summer Collection',
  'Autumn Layers',
  'Winter Collection',
  'Performance Active',
  'Business Casual',
  'Streetwear',
  'Travel Collection'
];

const ADJECTIVES = ['Heavyweight', 'Premium', 'Minimalist', 'Cozy', 'Technical', 'Classic', 'Relaxed', 'Vintage', 'Utility', 'Refined'];

export function generateMockProducts(count = 1000) {
  const products = [];

  for (let i = 0; i < count; i++) {
    const categoryKeys = Object.keys(CATEGORIES);
    const category = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    const subCategories = CATEGORIES[category];
    const subCategory = subCategories[Math.floor(Math.random() * subCategories.length)];
    
    const materialObj = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    const fit = FITS[Math.floor(Math.random() * FITS.length)];
    const collectionName = COLLECTIONS[Math.floor(Math.random() * COLLECTIONS.length)];
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    
    // Build names like: "NovaWear Premium French Terry Hoodie" or "NovaWear Cozy Woven Denim Chinos"
    const name = `NovaWear ${adjective} ${subCategory.replace(/s$/, '')}`;
    
    // Unique SKU construction
    const catCode = category.substring(0, 2).toUpperCase();
    const subCode = subCategory.substring(0, 3).toUpperCase();
    const randomNum = String(Math.floor(Math.random() * 900) + 100);
    const sku = `NW-${catCode}-${subCode}-${randomNum}-${i}`; // add index to guarantee uniqueness
    
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sku.toLowerCase()}`;
    
    // Prices based on subCategory complexity
    let basePrice = 25;
    if (category === 'Jackets') basePrice = 110;
    else if (category === 'Jeans') basePrice = 65;
    else if (category === 'Hoodies') basePrice = 75;
    else if (category === 'Shoes') basePrice = 85;
    else if (category === 'Accessories') basePrice = 18;

    const price = Math.round((basePrice + Math.random() * 35) * 100) / 100;
    const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 4 + 1) * 5 : 0; // 5%, 10%, 15%, 20%
    
    // Pick 2-4 colors
    const colorsCount = Math.floor(Math.random() * 3) + 2;
    const productColors = [];
    while (productColors.length < colorsCount) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (!productColors.includes(c)) productColors.push(c);
    }

    // Pick sizes
    let sizes = SIZES.apparel;
    if (category === 'Jeans') {
      sizes = SIZES.pants;
    } else if (category === 'Shoes') {
      sizes = SIZES.shoes;
    } else if (category === 'Accessories') {
      sizes = SIZES.accessories;
    }

    const stock = Math.floor(Math.random() * 180) + 20;
    const reservedStock = Math.floor(Math.random() * Math.min(10, stock));
    const rating = Math.round((4.0 + Math.random() * 1.0) * 10) / 10;
    const reviewCount = Math.floor(Math.random() * 80) + 10;

    const descriptions = [
      `A premium ${fit.toLowerCase()} apparel item styled with structural lines and reinforced stitching. Built for both urban streetwear and cozy lounging.`,
      `Engineered for daily resilience, this item features our breathable ${materialObj.name.toLowerCase()} blend. Crafted with high quality materials.`,
      `Incorporates technical styling accents with lightweight comfort. The perfect piece for layering during transitional seasons.`
    ];

    const tags = [category.toLowerCase(), subCategory.toLowerCase(), fit.split(' ')[0].toLowerCase(), materialObj.type.split(' ')[1]?.toLowerCase() || 'fabric'].filter(Boolean);
    tags.push('novawear');

    // Category-specific high quality clothing images
    const imagesByCategory = {
      'T-Shirts': [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&auto=format&fit=crop&q=60'
      ],
      'Shirts': [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=60'
      ],
      'Jeans': [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=500&auto=format&fit=crop&q=60'
      ],
      'Hoodies': [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60'
      ],
      'Jackets': [
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=500&auto=format&fit=crop&q=60'
      ],
      'Activewear': [
        'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60'
      ],
      'Shoes': [
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=500&auto=format&fit=crop&q=60'
      ],
      'Accessories': [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60'
      ]
    };

    // Subcategory specific accessory mapping
    let productImages = imagesByCategory[category] || imagesByCategory['T-Shirts'];
    if (category === 'Accessories') {
      if (subCategory === 'Caps') {
        productImages = ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60'];
      } else if (subCategory === 'Belts') {
        productImages = ['https://images.unsplash.com/photo-1624222247344-550fb8ec8bd3?w=500&auto=format&fit=crop&q=60'];
      } else if (subCategory === 'Socks') {
        productImages = ['https://images.unsplash.com/photo-1582966772680-860e372bb558?w=500&auto=format&fit=crop&q=60'];
      } else {
        productImages = ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60']; // Backpack
      }
    }

    const selectedImage = productImages[Math.floor(Math.random() * productImages.length)];

    products.push({
      sku,
      name,
      slug,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      brand: 'NovaWear',
      category,
      subCategory,
      gender,
      collectionName,
      fit,
      material: materialObj.name,
      fabricType: materialObj.type,
      gsm: materialObj.gsm,
      season: category === 'Accessories' ? 'All Season' : (collectionName.includes('Winter') ? 'Fall/Winter' : 'Spring/Summer'),
      occasion: [OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)], 'Casual'],
      price,
      discount,
      currency: 'USD',
      colors: productColors,
      sizes,
      stock,
      reservedStock,
      rating,
      reviewCount,
      features: ['Double stitched seams', 'Pre-shrunk fibers', 'Custom branded tag details'],
      careInstructions: 'Machine wash cold with like colors. Tumble dry low.',
      tags,
      thumbnail: selectedImage,
      images: [selectedImage]
    });
  }

  return products;
}
