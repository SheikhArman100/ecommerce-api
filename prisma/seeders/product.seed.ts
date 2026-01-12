import { prisma } from "../../src/client";
import { UserRole } from "../../src/generated/enums";




export async function seedProducts() {
  // Find admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: UserRole.admin }
  });

  if (!adminUser) {
    throw new Error('Admin user not found! Please run user seeds first.');
  }

  // Check if products already exist
  const existingProductsCount = await prisma.product.count();
  if (existingProductsCount > 0) {
    console.log(`Products already exist (${existingProductsCount} found), skipping product seeding...`);
    return;
  }

  // Create or update sizes with upsert
  const sizeData = ['0.5', '1', '1.5', '2'];
  const sizes = await Promise.all(
    sizeData.map(async (sizeName) => {
      return prisma.size.upsert({
        where: { name: sizeName },
        update: {
          updatedBy: adminUser.id
        },
        create: {
          name: sizeName,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Create or update categories
  const categoryData = ['Cakes', 'Pastries'];
  const categories = await Promise.all(
    categoryData.map(async (categoryName) => {
      return prisma.category.upsert({
        where: { name: categoryName },
        update: {
          updatedBy: adminUser.id
        },
        create: {
          name: categoryName,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Create or update flavors
  const flavorData = [
    { name: 'Chocolate', color: '#4B3621' },
    { name: 'Vanilla', color: '#F3E5AB' },
    { name: 'Strawberry', color: '#FF69B4' }
  ];

  const flavors = await Promise.all(
    flavorData.map(async (flavor) => {
      return prisma.flavor.upsert({
        where: { name: flavor.name },
        update: {
          color: flavor.color,
          updatedBy: adminUser.id
        },
        create: {
          name: flavor.name,
          color: flavor.color,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Create products
  const products = [
    { name: 'Birthday Cake', basePrice: 30 },
    { name: 'Wedding Cake', basePrice: 40 },
    { name: 'Cheesecake', basePrice: 35 },
    { name: 'Red Velvet Cake', basePrice: 32 },
    { name: 'Black Forest Cake', basePrice: 34 }
  ];

  for (const product of products) {
    const slug = product.name.toLowerCase().replace(/ /g, '-');
    
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title: product.name,
        slug,
        description: `Delicious ${product.name} available in different sizes and flavors`,
        categoryId: categories[0].id,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        flavors: {
          create: flavors.map(flavor => ({
            flavorId: flavor.id,
            sizes: {
              create: sizes.map(size => ({
                sizeId: size.id,
                stock: Math.floor(Math.random() * 20) + 5,
                price: Math.round(product.basePrice * parseFloat(size.name))
              }))
            }
          }))
        }
      }
    });
  }

  console.log('Products seeded successfully');
}
