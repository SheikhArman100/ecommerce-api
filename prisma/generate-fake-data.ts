#!/usr/bin/env ts-node

import { dataFactory } from './factory';
import { prisma } from '../src/client';

async function main() {
  try {
    console.log('🎯 Starting comprehensive fake data generation for dashboard testing...\n');

    // Clean existing data first (optional - comment out if you want to keep existing data)
    console.log('🧹 Cleaning existing data...');
    await dataFactory.cleanAllData();

    console.log('⏳ Waiting for database cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    // Generate comprehensive fake data
    await dataFactory.generateAllData({
      users: 150,        // 150 users (including 1 admin)
      categories: 10,    // 10 categories
      flavors: 12,       // 12 flavors
      sizes: 8,          // 8 sizes
      products: 120,     // 120 products
      orders: 500,       // 500 orders
      reviews: 200,      // 200 reviews
      cartItems: 150,    // 150 cart items
      wishlistItems: 200 // 200 wishlist items
    });

    console.log('⏳ Waiting for data generation to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    // Verify data counts
    console.log('\n📊 Data Generation Summary:');
    console.log('================================');

    const [
      userCount,
      categoryCount,
      flavorCount,
      sizeCount,
      productCount,
      orderCount,
      reviewCount,
      cartItemCount,
      wishlistCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.flavor.count(),
      prisma.size.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.cartItem.count(),
      prisma.wishList.count()
    ]);

    console.log(`👥 Users: ${userCount}`);
    console.log(`📂 Categories: ${categoryCount}`);
    console.log(`🎨 Flavors: ${flavorCount}`);
    console.log(`📏 Sizes: ${sizeCount}`);
    console.log(`🛍️  Products: ${productCount}`);
    console.log(`📦 Orders: ${orderCount}`);
    console.log(`⭐ Reviews: ${reviewCount}`);
    console.log(`🛒 Cart Items: ${cartItemCount}`);
    console.log(`❤️ Wishlist Items: ${wishlistCount}`);

    console.log('\n✅ Dashboard data generation completed successfully!');
    console.log('🚀 Your dashboard now has comprehensive data for testing all analytics features!');
    console.log('\n📝 Admin Login Credentials:');
    console.log('   Email: admin@ecommerce.com');
    console.log('   Password: 123456');

  } catch (error) {
    console.error('❌ Error during data generation:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
