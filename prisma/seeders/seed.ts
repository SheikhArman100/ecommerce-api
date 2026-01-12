
import { seedUsers } from './user.seed';
import { seedProducts } from './product.seed';
import { seedWishlists } from './wishlist.seed';
import { seedOrders } from './order.seed';
import { seedReviews } from './review.seed';
import {prisma} from "../../src/client"


async function main() {
  try {
    // First seed users
    await seedUsers();
    // Then seed products
    await seedProducts();
    // Then seed wishlists (needs users and products)
    await seedWishlists();
    // Then seed orders (needs users and products)
    await seedOrders();
    // Finally seed reviews (needs users, products, and orders)
    await seedReviews();

    console.log('\nAll seeds completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
