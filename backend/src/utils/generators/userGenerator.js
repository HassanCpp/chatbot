import crypto from 'crypto';

const FIRST_NAMES = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda', 'Joseph', 'Melissa', 'Christopher', 'Stephanie', 'Daniel', 'Nicole', 'Matthew', 'Elizabeth'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const COLORS = ['Midnight Black', 'Crisp White', 'Heather Grey', 'Sage Green', 'Navy Blue', 'Sand Beige'];
const SIZES = ['S', 'M', 'L', 'XL'];
const CATEGORIES = ['T-Shirts', 'Jeans', 'Hoodies', 'Jackets', 'Activewear', 'Shoes', 'Accessories'];

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateMockUsers(count = 500) {
  const users = [];
  const hashedPassword = hashPassword('password123'); // Default password for seeded accounts

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    
    // Add index to ensure email uniqueness
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
    
    // First 5 are admins
    const role = i < 5 ? 'admin' : 'customer';

    // Randomized customer preferences to feed the recommendation engine
    const sizePreference = SIZES[Math.floor(Math.random() * SIZES.length)];
    const colorPreference = COLORS[Math.floor(Math.random() * COLORS.length)];
    const categoryPreference = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    users.push({
      name,
      email,
      password: hashedPassword,
      role,
      preferences: {
        size: sizePreference,
        color: colorPreference,
        category: categoryPreference,
        budget: Math.floor(Math.random() * 150) + 40
      },
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000) // registered up to 4 months ago
    });
  }

  return users;
}
