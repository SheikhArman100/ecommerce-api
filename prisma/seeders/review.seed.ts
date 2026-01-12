import { prisma } from "../../src/client";
import { OrderStatus } from "../../src/generated/enums";

export async function seedReviews() {
  // Find existing delivered orders with their items
  const deliveredOrders = await prisma.order.findMany({
    where: { status: OrderStatus.Delivered },
    include: {
      user: true,
      items: {
        include: {
          product: true
        }
      }
    },
    take: 10 // Get first 10 delivered orders
  });

  if (deliveredOrders.length === 0) {
    throw new Error('No delivered orders found! Please run order seeds first.');
  }

  // Check if reviews already exist
  const existingReviewsCount = await prisma.review.count();
  if (existingReviewsCount > 0) {
    console.log(`Reviews already exist (${existingReviewsCount} found), skipping review seeding...`);
    return;
  }

  // Create reviews for the orders
  const reviewComments = [
    "Absolutely delicious! Highly recommend this product.",
    "Great quality and fast delivery. Will order again.",
    "The taste was amazing, exactly as described.",
    "Good value for money. Very satisfied with the purchase.",
    "Excellent customer service and product quality.",
    "Fresh and well-packaged. Loved the experience.",
    "Perfect for special occasions. Everyone enjoyed it!",
    "Better than expected. The flavor was outstanding.",
    "Quick delivery and great packaging. Highly satisfied.",
    "Worth every penny. Will definitely recommend to friends."
  ];

  const reviews = [];
  for (const order of deliveredOrders) {
    // Create 1-2 reviews per order (for different products in the order)
    const reviewCount = Math.min(order.items.length, Math.floor(Math.random() * 2) + 1);
    const productsToReview = order.items.slice(0, reviewCount);

    for (const orderItem of productsToReview) {
      const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
      const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];

      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId: order.userId,
          productId: orderItem.productId,
          orderId: order.id,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          isHidden: Math.random() < 0.1 // 10% chance of being hidden for testing
        }
      });

      reviews.push(review);
    }
  }

  console.log(`Reviews seeded successfully: ${reviews.length} reviews created`);
}
