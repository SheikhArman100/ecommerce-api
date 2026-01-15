import { prisma } from "../../src/client";

export async function seedCarts() {
  // Find existing users and products with their flavors and sizes
  const users = await prisma.user.findMany({
    take: 5, // Get first 5 users
    include: {
      cart: true // Check if they already have carts
    }
  });

  const products = await prisma.product.findMany({
    take: 8, // Get first 8 products
    include: {
      flavors: {
        include: {
          sizes: {
            include: {
              size: true
            }
          }
        }
      }
    }
  });

  if (users.length === 0 || products.length === 0) {
    throw new Error('Users and products must be seeded first!');
  }

  // Check if carts already exist
  const existingCartsCount = await prisma.cart.count();
  if (existingCartsCount > 0) {
    console.log(`Carts already exist (${existingCartsCount} found), skipping cart seeding...`);
    return;
  }

  const carts = [];

  for (const user of users) {
    // Skip if user already has a cart
    if (user.cart) {
      console.log(`User ${user.email} already has a cart, skipping...`);
      continue;
    }

    // Create 1-3 cart items per user
    const cartItemCount = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = products
      .sort(() => 0.5 - Math.random())
      .slice(0, cartItemCount);

    const cartItems = selectedProducts.map(product => {
      // Randomly select a flavor and size for this product
      const flavor = product.flavors[Math.floor(Math.random() * product.flavors.length)];
      const size = flavor?.sizes[Math.floor(Math.random() * flavor.sizes.length)];

      if (!flavor || !size || !size.sizeId) {
        throw new Error(`Product ${product.title} missing flavor or size data`);
      }

      return {
        productId: product.id,
        flavorId: flavor.flavorId,
        sizeId: size.sizeId,
        quantity: Math.floor(Math.random() * 3) + 1 // 1-3 quantity
      };
    });

    // Create cart with items
    const cart = await prisma.cart.create({
      data: {
        userId: user.id,
        items: {
          create: cartItems
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: { title: true, slug: true }
            },
            productFlavorSize: {
              select: { price: true, stock: true }
            }
          }
        }
      }
    });

    carts.push(cart);
  }

  console.log(`Carts seeded successfully: ${carts.length} carts created with ${carts.reduce((total, cart) => total + cart.items.length, 0)} items`);
}
