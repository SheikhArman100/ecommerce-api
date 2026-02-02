import { prisma } from "../../src/client";
import { OrderStatus } from "../../src/generated/enums";

export async function seedOrders() {
  // Find existing users and products
  const users = await prisma.user.findMany({
    take: 5 // Get first 5 users
  });

 const products = await prisma.product.findMany({
  take: 8,
  include: {
    flavors: {
      include: {
        flavor: true, // include the Flavor object for snapshot
        sizes: {
          include: {
            size: true, // include the Size object for snapshot
          }
        }
      }
    }
  }
});

  if (users.length === 0 || products.length === 0) {
    throw new Error('Users and products must be seeded first!');
  }

  // Check if orders already exist
  const existingOrdersCount = await prisma.order.count();
  if (existingOrdersCount > 0) {
    console.log(`Orders already exist (${existingOrdersCount} found), skipping order seeding...`);
    return;
  }

  const orders = [];
  const orderStatuses = [OrderStatus.Pending, OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Cancelled];

  for (const user of users) {
    // Create 2-4 orders per user with different statuses
    const orderCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < orderCount; i++) {
      // Select 1-4 random products for this order
      const orderProducts = products
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 4) + 1);

      let totalAmount = 0;
      const orderItems = orderProducts.map(product => {
        const flavor = product.flavors[Math.floor(Math.random() * product.flavors.length)];
        const size = flavor?.sizes[Math.floor(Math.random() * flavor.sizes.length)];

        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = size?.price || 30;
        totalAmount += price * quantity;

        return {
          productId: product.id,
          flavorId: flavor?.flavorId || 1,
          sizeId: size?.sizeId || 1,
          quantity,
          price,
          productTitle: product.title,
          flavorName: flavor?.flavor?.name || null,
          sizeName: size?.size?.name || null
        };
      });

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          totalAmount,
          items: {
            create: orderItems
          }
        },
        include: {
          items: {
            include: {
              product: true,
              productFlavorSize: true
            }
          }
        }
      });

      orders.push(order);
    }
  }

  console.log(`Orders seeded successfully: ${orders.length} orders created`);
}
