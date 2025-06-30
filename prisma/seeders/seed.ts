import { PrismaClient } from '@prisma/client';
import { seedUsers } from './user.seed';
import { seedProducts } from './product.seed';

const prisma = new PrismaClient();

async function main() {
  try {
    // First seed users
    await seedUsers();
    console.log('Users seeded successfully');

    // Then seed products
    await seedProducts();
    
    // Fetch and log product details
    const products = await prisma.product.findMany({
      include: {
        category: true,
        flavors: {
          include: {
            flavor: true,
            sizes: {
              include: {
                size: true
              }
            }
          }
        }
      }
    });

    console.log('\n=== Product Details ===');
    products.forEach(product => {
      console.log(`\nProduct: ${product.title}`);
      console.log(`Category: ${product.category?.name || 'Uncategorized'}`);
      console.log('Flavors:');
      product.flavors?.forEach(pf => {
        console.log(`  - ${pf.flavor?.name || 'Unknown Flavor'}`);
        console.log('    Sizes:');
        pf.sizes?.forEach(size => {
          console.log(`      * ${size.size?.name || 'Unknown Size'} - Stock: ${size.stock}, Price: $${size.price}`);
        });
      });
    });

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

