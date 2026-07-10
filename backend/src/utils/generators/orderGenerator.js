import mongoose from 'mongoose';

const CARRIERS = ['FedEx', 'UPS', 'USPS', 'DHL'];
const STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function generateMockOrders(seededUsers, seededProducts, count = 2000) {
  const orders = [];

  for (let i = 0; i < count; i++) {
    // Pick a random user
    const user = seededUsers[Math.floor(Math.random() * seededUsers.length)];
    
    // Choose 1-3 unique items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;
    
    const pickedProducts = [];
    while (pickedProducts.length < itemCount) {
      const prod = seededProducts[Math.floor(Math.random() * seededProducts.length)];
      if (!pickedProducts.includes(prod._id)) {
        pickedProducts.push(prod._id);
        
        const color = prod.colors[Math.floor(Math.random() * prod.colors.length)];
        const size = prod.sizes[Math.floor(Math.random() * prod.sizes.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        const discountPrice = prod.price * (1 - (prod.discount / 100));
        
        items.push({
          productId: prod._id,
          sku: prod.sku,
          name: prod.name,
          color,
          size,
          price: Math.round(discountPrice * 100) / 100,
          quantity,
          thumbnail: prod.thumbnail
        });

        subtotal += discountPrice * quantity;
      }
    }

    const discountAmount = Math.random() > 0.8 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;
    
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const paymentStatus = status === 'Cancelled' ? 'Pending' : (Math.random() > 0.95 ? 'Failed' : 'Paid');
    const carrier = CARRIERS[Math.floor(Math.random() * CARRIERS.length)];
    
    // Construct Order ID (starting from 1004)
    const orderIdNum = 1004 + i;
    const orderId = `NW-${orderIdNum}`;

    const trackingNumber = status === 'Processing' || status === 'Cancelled' 
      ? 'PENDING' 
      : `${carrier.substring(0,2).toUpperCase()}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const orderDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // within last 90 days
    const estimatedDelivery = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);

    orders.push({
      orderId,
      userId: user._id,
      customerName: user.name,
      customerEmail: user.email,
      items,
      totalAmount,
      discountAmount,
      couponUsed: discountAmount > 0 ? 'WELCOME10' : undefined,
      shippingAddress: {
        recipient: user.name,
        addressLine1: `${Math.floor(Math.random() * 800) + 10} Street Ave`,
        city: 'Portland',
        state: 'Oregon',
        postalCode: '97201',
        country: 'United States'
      },
      paymentStatus,
      status,
      trackingNumber,
      carrier,
      estimatedDelivery,
      createdAt: orderDate,
      updatedAt: orderDate
    });
  }

  return orders;
}
