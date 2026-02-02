import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { UserRole, OrderStatus } from '../src/generated/enums';
import { prisma } from '../src/client';

// Factory class for generating fake data
export class DataFactory {
  private saltRounds = 10;

  // Generate fake users
  async createUsers(count: number = 10) {
    const users = [];
    const hashedPassword = await bcrypt.hash('123456', this.saltRounds);

    // Always create at least one admin
    if (count > 0) {
      const adminUser = await prisma.user.upsert({
        where: { email: 'admin@ecommerce.com' },
        update: {},
        create: {
          name: 'Admin User',
          email: 'admin@ecommerce.com',
          phoneNumber: faker.phone.number(),
          password: hashedPassword,
          isVerified: true,
          role: UserRole.admin,
          detail: {
            create: {
              address: faker.location.streetAddress(),
              city: faker.location.city(),
              road: faker.location.street()
            }
          }
        }
      });
      users.push(adminUser);
      count--;
    }

    // Create regular users
    for (let i = 0; i < count; i++) {
      const user = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
          password: hashedPassword,
          isVerified: faker.datatype.boolean({ probability: 0.8 }),
          role: UserRole.user,
          detail: {
            create: {
              address: faker.location.streetAddress(),
              city: faker.location.city(),
              road: faker.location.street()
            }
          }
        }
      });
      users.push(user);
    }

    console.log(`✅ Created ${users.length} users`);
    return users;
  }

  // Generate fake categories
  async createCategories(count: number = 5) {
    const categories = [];
    const categoryNames = [
      'Cakes', 'Pastries', 'Cookies', 'Bread', 'Desserts',
      'Beverages', 'Snacks', 'Breakfast', 'Lunch', 'Dinner'
    ];

    const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
    if (!adminUser) throw new Error('Admin user not found');

    for (let i = 0; i < Math.min(count, categoryNames.length); i++) {
      const category = await prisma.category.upsert({
        where: { name: categoryNames[i] },
        update: {},
        create: {
          name: categoryNames[i],
          slug: categoryNames[i].toLowerCase(),
          description: faker.lorem.sentence(),
          isActive: true,
          displayOrder: i + 1,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
      categories.push(category);
    }

    console.log(`✅ Created ${categories.length} categories`);
    return categories;
  }

  // Generate fake flavors
  async createFlavors(count: number = 8) {
    const flavors = [];
    const flavorData = [
      { name: 'Chocolate', color: '#4B3621' },
      { name: 'Vanilla', color: '#F3E5AB' },
      { name: 'Strawberry', color: '#FF69B4' },
      { name: 'Caramel', color: '#FFD39B' },
      { name: 'Coffee', color: '#8B4513' },
      { name: 'Mint', color: '#98FB98' },
      { name: 'Lemon', color: '#FFFF00' },
      { name: 'Blueberry', color: '#4169E1' },
      { name: 'Raspberry', color: '#DC143C' },
      { name: 'Coconut', color: '#F5F5DC' }
    ];

    const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
    if (!adminUser) throw new Error('Admin user not found');

    for (let i = 0; i < Math.min(count, flavorData.length); i++) {
      const flavor = await prisma.flavor.upsert({
        where: { name: flavorData[i].name },
        update: {},
        create: {
          name: flavorData[i].name,
          color: flavorData[i].color,
          description: faker.lorem.sentence(),
          isActive: true,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
      flavors.push(flavor);
    }

    console.log(`✅ Created ${flavors.length} flavors`);
    return flavors;
  }

  // Generate fake sizes
  async createSizes(count: number = 6) {
    const sizes = [];
    const sizeNames = ["0.5", "1", "1.5", "2", "2.5", "3","3.5", "4","4.5", "5"];

    const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
    if (!adminUser) throw new Error('Admin user not found');

    for (let i = 0; i < Math.min(count, sizeNames.length); i++) {
      const size = await prisma.size.upsert({
        where: { name: sizeNames[i] },
        update: {},
        create: {
          name: sizeNames[i],
          description: faker.lorem.sentence(),
          isActive: true,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
      sizes.push(size);
    }

    console.log(`✅ Created ${sizes.length} sizes`);
    return sizes;
  }

  // Generate fake products
  async createProducts(count: number = 20) {
    const products = [];
    const categories = await prisma.category.findMany();
    const flavors = await prisma.flavor.findMany();
    const sizes = await prisma.size.findMany();

    if (categories.length === 0 || flavors.length === 0 || sizes.length === 0) {
      throw new Error('Categories, flavors, and sizes must be created first');
    }

    const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
    if (!adminUser) throw new Error('Admin user not found');

    const productNames = [
      'Chocolate Cake', 'Vanilla Cupcake', 'Strawberry Tart', 'Caramel Brownie',
      'Coffee Muffin', 'Mint Ice Cream', 'Lemon Pie', 'Blueberry Cheesecake',
      'Raspberry Macaron', 'Coconut Pudding', 'Birthday Cake', 'Wedding Cake',
      'Red Velvet Cake', 'Black Forest Cake', 'Tiramisu', 'Panna Cotta',
      'Crème Brûlée', 'Fruit Tart', 'Éclair', 'Profiterole'
    ];

    for (let i = 0; i < Math.min(count, productNames.length); i++) {
      const productName = productNames[i];
      const slug = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Randomly select 2-4 flavors for this product
      const productFlavors = faker.helpers.arrayElements(flavors, {
        min: 2,
        max: 4
      });

      const flavorData = productFlavors.map(flavor => {
        // Randomly select 2-3 sizes for each flavor
        const flavorSizes = faker.helpers.arrayElements(sizes, {
          min: 2,
          max: 3
        });

        return {
          flavorId: flavor.id,
          sizes: {
            create: flavorSizes.map(size => ({
              sizeId: size.id,
              stock: faker.number.int({ min: 5, max: 50 }),
              price: faker.number.float({
                min: 10,
                max: 100,
                fractionDigits: 2
              })
            }))
          }
        };
      });

      const product = await prisma.product.create({
        data: {
          title: productName,
          slug,
          description: faker.lorem.paragraph(),
          isActive: faker.datatype.boolean({ probability: 0.9 }),
          categoryId: faker.helpers.arrayElement(categories).id,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
          flavors: {
            create: flavorData
          }
        }
      });

      products.push(product);
    }

    console.log(`✅ Created ${products.length} products`);
    return products;
  }

  // Generate fake orders
  async createOrders(count: number = 50) {
    const orders = [];
    const users = await prisma.user.findMany({ where: { role: UserRole.user } });
    const products = await prisma.product.findMany({
      include: {
        flavors: {
          include: {
            flavor: true,
            sizes: {
              include: { size: true }
            }
          }
        }
      }
    });

    if (users.length === 0 || products.length === 0) {
      throw new Error('Users and products must be created first');
    }

    const orderStatuses = [OrderStatus.Pending, OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Cancelled];

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const orderDate = faker.date.past({ years: 1 });

      // Create 1-5 order items
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const selectedProducts = faker.helpers.arrayElements(products, itemCount);

      let totalAmount = 0;
      const orderItems = selectedProducts.map(product => {
        const flavor = faker.helpers.arrayElement(product.flavors);
        // Only use sizes that are not quantity-based (sizeId is not null)
        const validSizes = flavor.sizes.filter(size => size.sizeId !== null);
        if (validSizes.length === 0) {
          // If no valid sizes, skip this product
          return null;
        }
        const size = faker.helpers.arrayElement(validSizes);

        const quantity = faker.number.int({ min: 1, max: 3 });
        const price = size.price;
        totalAmount += price * quantity;

        return {
          productId: product.id,
          flavorId: flavor.flavorId,
          sizeId: size.sizeId!,
          quantity,
          price,
          productTitle: product.title,
          flavorName: flavor.flavor?.name || null,
          sizeName: size.size?.name || null
        };
      }).filter(item => item !== null); // Remove null items

      // Bias towards delivered orders for reviews
      const statusWeights = [0.2, 0.3, 0.4, 0.1]; // Pending, Shipped, Delivered, Cancelled
      const status = faker.helpers.weightedArrayElement(
        orderStatuses.map((status, index) => ({ weight: statusWeights[index], value: status }))
      );

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          status,
          totalAmount,
          createdAt: orderDate,
          updatedAt: orderDate,
          items: {
            create: orderItems
          }
        }
      });

      orders.push(order);
    }

    console.log(`✅ Created ${orders.length} orders`);
    return orders;
  }

  // Generate fake reviews
  async createReviews(count: number = 30) {
    const reviews = [];
    const deliveredOrders = await prisma.order.findMany({
      where: { status: OrderStatus.Delivered },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (deliveredOrders.length === 0) {
      throw new Error('Delivered orders must be created first');
    }

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
      "Worth every penny. Will definitely recommend to friends.",
      "The texture was perfect and the flavor was incredible.",
      "Exceeded my expectations in every way.",
      "Professional packaging and timely delivery.",
      "One of the best purchases I've made recently.",
      "The quality is outstanding for the price."
    ];

    for (let i = 0; i < Math.min(count, deliveredOrders.length * 2); i++) {
      const order = faker.helpers.arrayElement(deliveredOrders);
      const orderItem = faker.helpers.arrayElement(order.items);

      // Check if review already exists for this order-item combination
      const existingReview = await prisma.review.findFirst({
        where: {
          orderId: order.id,
          productId: orderItem.productId
        }
      });

      if (existingReview) continue;

      const rating = faker.number.int({ min: 3, max: 5 });
      const comment = faker.helpers.arrayElement(reviewComments);

      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId: order.userId,
          productId: orderItem.productId,
          orderId: order.id,
          ipAddress: faker.internet.ip(),
          isHidden: faker.datatype.boolean({ probability: 0.05 }), // 5% hidden
          createdAt: faker.date.between({
            from: order.createdAt,
            to: new Date()
          })
        }
      });

      reviews.push(review);
    }

    console.log(`✅ Created ${reviews.length} reviews`);
    return reviews;
  }

  // Generate fake cart items
  async createCartItems(count: number = 20) {
    const cartItems = [];
    const users = await prisma.user.findMany({
      where: { role: UserRole.user }
    });

    const products = await prisma.product.findMany({
      include: {
        flavors: {
          include: {
            sizes: true
          }
        }
      }
    });

    if (users.length === 0 || products.length === 0) {
      throw new Error('Users and products must be created first');
    }

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const product = faker.helpers.arrayElement(products);

      // Skip if user already has this product in cart
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          cart: { userId: user.id },
          productId: product.id
        }
      });

      if (existingCartItem) continue;

      const flavor = faker.helpers.arrayElement(product.flavors);
      // Only use sizes that are not quantity-based (sizeId is not null)
      const validSizes = flavor.sizes.filter(size => size.sizeId !== null);
      if (validSizes.length === 0) continue; // Skip if no valid sizes

      const size = faker.helpers.arrayElement(validSizes);

      // Create or get existing cart for user using upsert
      const cart = await prisma.cart.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id }
      });

      const cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          flavorId: flavor.flavorId,
          sizeId: size.sizeId!,
          quantity: faker.number.int({ min: 1, max: 3 })
        }
      });

      cartItems.push(cartItem);
    }

    console.log(`✅ Created ${cartItems.length} cart items`);
    return cartItems;
  }

  // Generate fake wishlist items
  async createWishlistItems(count: number = 25) {
    const wishlistItems = [];
    const users = await prisma.user.findMany({ where: { role: UserRole.user } });
    const products = await prisma.product.findMany();

    if (users.length === 0 || products.length === 0) {
      throw new Error('Users and products must be created first');
    }

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const product = faker.helpers.arrayElement(products);

      // Skip if user already has this product in wishlist
      const existingWishlistItem = await prisma.wishList.findFirst({
        where: {
          userId: user.id,
          productId: product.id
        }
      });

      if (existingWishlistItem) continue;

      const wishlistItem = await prisma.wishList.create({
        data: {
          userId: user.id,
          productId: product.id
        }
      });

      wishlistItems.push(wishlistItem);
    }

    console.log(`✅ Created ${wishlistItems.length} wishlist items`);
    return wishlistItems;
  }

  // Main method to generate all fake data
  async generateAllData(options: {
    users?: number;
    categories?: number;
    flavors?: number;
    sizes?: number;
    products?: number;
    orders?: number;
    reviews?: number;
    cartItems?: number;
    wishlistItems?: number;
  } = {}) {
    console.log('🚀 Starting fake data generation for dashboard testing...');

    try {
      // Generate substantial data for meaningful dashboard analytics
      await this.createUsers(Math.max(options.users || 150, 100)); // At least 100 users
      await this.createCategories(Math.max(options.categories || 10, 5));
      await this.createFlavors(Math.max(options.flavors || 12, 8));
      await this.createSizes(Math.max(options.sizes || 8, 6));
      await this.createProducts(Math.max(options.products || 120, 100)); // At least 100 products
      await this.createOrders(Math.max(options.orders || 500, 300)); // At least 300 orders for good analytics
      await this.createReviews(Math.max(options.reviews || 200, 150)); // At least 150 reviews
      await this.createCartItems(Math.max(options.cartItems || 150, 100)); // At least 100 cart items
      await this.createWishlistItems(Math.max(options.wishlistItems || 200, 150)); // At least 150 wishlist items

      console.log('🎉 All fake data generated successfully!');
      console.log('📊 Dashboard now has sufficient data for comprehensive analytics!');
    } catch (error) {
      console.error('❌ Error generating fake data:', error);
      throw error;
    }
  }

  // Clean all data (useful for testing)
  async cleanAllData() {
    console.log('🧹 Cleaning all data...');

    await prisma.review.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishList.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productFlavorSize.deleteMany();
    await prisma.file.deleteMany();
    await prisma.productFlavor.deleteMany();
    await prisma.product.deleteMany();
    await prisma.size.deleteMany();
    await prisma.flavor.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userDetail.deleteMany();
    await prisma.refreshToken.deleteMany();

    // Keep admin users but delete regular users
    await prisma.user.deleteMany({
      where: { role: { not: UserRole.admin } }
    });

    console.log('✅ All data cleaned successfully!');
  }
}

// Export singleton instance
export const dataFactory = new DataFactory();
