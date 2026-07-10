const COMMENTS = {
  5: [
    "Amazing quality. The GSM fabric thickness is fantastic.",
    "Exactly what I was looking for. Relaxed fit is spot on.",
    "Best purchase of the year! The material feels premium and holds structure.",
    "Extremely soft alpaca wool. Very cozy for cold evenings.",
    "Super fast delivery. Features are exactly as described.",
    "Awesome technical design. Waterproofing works beautifully in heavy rain.",
    "Beautiful camp-collar drape. Linen is breathable and comfortable."
  ],
  4: [
    "Very nice item. Fabric is thick and high quality.",
    "Fits slightly larger than expected, but perfect for streetwear layers.",
    "Solid quality garment. Color is nice and minimal.",
    "Good quality, dry clean only though. Fits nicely.",
    "Very breathable and cool. A summer staple for sure."
  ],
  3: [
    "Average item. Fabric feels decent but stitching is a bit rough.",
    "A bit loose around the collar. Quality is okay.",
    "Color is slightly different from what was shown in thumbnails.",
    "Decent, but shranked slightly after first standard machine wash."
  ],
  2: [
    "Disappointed in the fabric. Felt thinner than expected.",
    "Stitching came loose after one wash. Not up to standard.",
    "The sizes run way too big. Fits like a tent."
  ],
  1: [
    "Poor quality stitching. Threads pulling out everywhere.",
    "Terrible fit. Heavyweight is just heavy and uncomfortable.",
    "Defective button fixtures on arrival. Do not recommend."
  ]
};

export function generateMockReviews(seededUsers, seededProducts, count = 10000) {
  const reviews = [];

  for (let i = 0; i < count; i++) {
    const product = seededProducts[Math.floor(Math.random() * seededProducts.length)];
    const user = seededUsers[Math.floor(Math.random() * seededUsers.length)];
    
    // Weighted rating: skew towards positive reviews
    const ratingRand = Math.random();
    let rating = 5;
    if (ratingRand > 0.85) rating = 4;
    else if (ratingRand > 0.95) rating = 3;
    else if (ratingRand > 0.98) rating = 2;
    else if (ratingRand > 0.99) rating = 1;

    const templates = COMMENTS[rating];
    const comment = templates[Math.floor(Math.random() * templates.length)];

    reviews.push({
      productId: product._id,
      userId: user._id,
      reviewerName: user.name,
      rating,
      comment,
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // last 60 days
    });
  }

  return reviews;
}
