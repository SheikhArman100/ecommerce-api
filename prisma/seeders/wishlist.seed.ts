import { prisma } from "../../src/client";

export async function seedWishlists() {
  // Find existing users and products
  const users = await prisma.user.findMany({
    take: 5 // Get first 5 users
  });

  const products = await prisma.product.findMany({
    take: 10 // Get first 10 products
  });

  if (users.length === 0 || products.length === 0) {
    throw new Error('Users and products must be seeded first!');
  }

  // Check if wishlists already exist
  const existingWishlistsCount = await prisma.wishList.count();
  if (existingWishlistsCount > 0) {
    console.log(`Wishlists already exist (${existingWishlistsCount} found), skipping wishlist seeding...`);
    return;
  }

  const wishlists = [];

  for (const user of users) {
    // Each user gets 3-7 random products in their wishlist
    const wishlistSize = Math.floor(Math.random() * 5) + 3; // 3-7 items
    const userProducts = products
      .sort(() => 0.5 - Math.random())
      .slice(0, wishlistSize);

    for (const product of userProducts) {
      const wishlist = await prisma.wishList.create({
        data: {
          userId: user.id,
          productId: product.id,
        }
      });

      wishlists.push(wishlist);
    }
  }

  console.log(`Wishlists seeded successfully: ${wishlists.length} wishlist items created`);
}
