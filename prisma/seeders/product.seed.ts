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
        update: { updatedBy: adminUser.id },
        create: {
          name: sizeName,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Create or update categories with descriptions
  const categoryData = [
    { name: 'Cakes', description: 'Signature layered creations' },
    { name: 'Pastries', description: 'Artisanal handcrafted pastries' },
    { name: 'Cookies', description: 'Small-batch artisan cookies' },
    { name: 'Macarons', description: 'French-style delicate macarons' }
  ];

  const categories = await Promise.all(
    categoryData.map(async (cat) => {
      return prisma.category.upsert({
        where: { name: cat.name },
        create: {
          name: cat.name,
          slug: cat.name.toLowerCase(),
          description: cat.description,
          displayOrder: categoryData.indexOf(cat) + 1,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        },
        update: {
          description: cat.description,
          slug: cat.name.toLowerCase(),
          displayOrder: categoryData.indexOf(cat) + 1,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Create or update flavors (existing + new)
  const flavorData = [
    // Existing
    { name: 'Chocolate', color: '#4B3621' },
    { name: 'Vanilla', color: '#F3E5AB' },
    { name: 'Strawberry', color: '#FF69B4' },
    // New
    { name: 'Dark Chocolate', color: '#3C1414' },
    { name: 'White Chocolate', color: '#F5F0E1' },
    { name: 'Matcha Green Tea', color: '#7BA05B' },
    { name: 'Salted Caramel', color: '#C68E17' },
    { name: 'Raspberry Rose', color: '#C21E56' },
    { name: 'Lemon Lavender', color: '#FFF44F' },
    { name: 'Hazelnut Praline', color: '#8B7355' },
    { name: 'Blueberry', color: '#4F86F7' }
  ];

  const flavors = await Promise.all(
    flavorData.map(async (flavor) => {
      return prisma.flavor.upsert({
        where: { name: flavor.name },
        create: {
          name: flavor.name,
          color: flavor.color,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        },
        update: {
          color: flavor.color,
          updatedBy: adminUser.id
        }
      });
    })
  );

  // Helper to find flavor by name
  const getFlavor = (name: string) => flavors.find(f => f.name === name)!;
  const getCategory = (name: string) => categories.find(c => c.name === name)!;

  // Create products with proper flavors per product
  const products = [
    {
      name: 'Birthday Cake',
      basePrice: 30,
      category: 'Cakes',
      description: 'A classic celebration cake with soft vanilla sponge layers, buttercream frosting, and colorful sprinkles',
      productFlavors: ['Chocolate', 'Vanilla', 'Strawberry', 'Dark Chocolate']
    },
    {
      name: 'Wedding Cake',
      basePrice: 40,
      category: 'Cakes',
      description: 'Elegant multi-tiered cake with delicate white chocolate ganache and edible floral accents',
      productFlavors: ['Vanilla', 'White Chocolate', 'Raspberry Rose', 'Lemon Lavender']
    },
    {
      name: 'Cheesecake',
      basePrice: 35,
      category: 'Cakes',
      description: 'Creamy New York style cheesecake on a buttery graham crust',
      productFlavors: ['Strawberry', 'Blueberry', 'Salted Caramel', 'Chocolate']
    },
    {
      name: 'Red Velvet Cake',
      basePrice: 32,
      category: 'Cakes',
      description: 'Rich cocoa-infused red velvet layers with cream cheese frosting',
      productFlavors: ['Chocolate', 'Vanilla', 'Dark Chocolate', 'White Chocolate']
    },
    {
      name: 'Black Forest Cake',
      basePrice: 34,
      category: 'Cakes',
      description: 'Decadent chocolate sponge with cherry compote, whipped cream, and chocolate shavings',
      productFlavors: ['Dark Chocolate', 'Chocolate', 'Strawberry', 'Hazelnut Praline']
    },
    {
      name: 'Midnight Truffle Cake',
      basePrice: 35,
      category: 'Cakes',
      description: 'Rich layers of dark chocolate mousse wrapped in a velvety ganache, finished with cocoa dust and gold leaf',
      productFlavors: ['Dark Chocolate', 'Salted Caramel', 'Hazelnut Praline', 'White Chocolate']
    },
    {
      name: 'Raspberry Rose Layer Cake',
      basePrice: 38,
      category: 'Cakes',
      description: 'Delicate rose-infused cream with layers of tart raspberry compote between tender vanilla sponge, topped with fresh raspberries and edible rose petals',
      productFlavors: ['Raspberry Rose', 'White Chocolate', 'Vanilla', 'Lemon Lavender']
    },
    {
      name: 'Matcha Opera Cake',
      basePrice: 36,
      category: 'Cakes',
      description: 'Green tea almond sponge layered with matcha-infused buttercream, topped with a glossy dark chocolate glaze',
      productFlavors: ['Matcha Green Tea', 'White Chocolate', 'Dark Chocolate', 'Hazelnut Praline']
    },
    {
      name: 'Salted Caramel Cheesecake',
      basePrice: 32,
      category: 'Cakes',
      description: 'Creamy New York style cheesecake on a buttery graham crust, swirled with homemade salted caramel and flaky sea salt',
      productFlavors: ['Salted Caramel', 'Blueberry', 'Strawberry', 'Dark Chocolate']
    },
    {
      name: 'Lemon Lavender Madeleines',
      basePrice: 18,
      category: 'Pastries',
      description: 'Buttery French shell-shaped sponge cakes with bright lemon zest, subtle dried lavender, and a light glaze',
      productFlavors: ['Lemon Lavender', 'Vanilla', 'Blueberry']
    },
    {
      name: 'Hazelnut Praline Eclairs',
      basePrice: 22,
      category: 'Pastries',
      description: 'Light choux pastry piped with silky hazelnut praline cream, dipped in dark chocolate glaze and toasted hazelnut pieces',
      productFlavors: ['Hazelnut Praline', 'Dark Chocolate', 'Salted Caramel', 'Matcha Green Tea']
    },
    {
      name: 'Madagascar VanBean Macarons',
      basePrice: 28,
      category: 'Macarons',
      description: 'Perfectly crisp almond meringue shells filled with smooth Madagascar vanilla bean buttercream',
      productFlavors: ['Vanilla', 'Raspberry Rose', 'Dark Chocolate', 'Matcha Green Tea', 'Lemon Lavender']
    },
    {
      name: 'Pistachio Rose Macarons',
      basePrice: 30,
      category: 'Macarons',
      description: 'Nutty pistachio shells with a fragrant rose water white chocolate ganache center',
      productFlavors: ['Raspberry Rose', 'Hazelnut Praline', 'White Chocolate', 'Dark Chocolate']
    },
    {
      name: 'Dark Chocolate Walnut Cookies',
      basePrice: 16,
      category: 'Cookies',
      description: 'Chewy bakery-style cookies loaded with chunks of bittersweet dark chocolate and toasted walnuts, finished with flaky sea salt',
      productFlavors: ['Dark Chocolate', 'Salted Caramel', 'Hazelnut Praline', 'White Chocolate']
    },
    {
      name: 'Earl Grey Lavender Shortbread',
      basePrice: 14,
      category: 'Cookies',
      description: 'Buttery Scottish shortbread infused with Earl Grey bergamot tea and dried lavender buds, dusted with powdered sugar',
      productFlavors: ['Lemon Lavender', 'Matcha Green Tea', 'Blueberry', 'Vanilla']
    }
  ];

  for (const product of products) {
    const slug = product.name.toLowerCase().replace(/ /g, '-');
    const category = getCategory(product.category);

    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title: product.name,
        slug,
        description: product.description,
        categoryId: category.id,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        flavors: {
          create: product.productFlavors.map(flavorName => ({
            flavorId: getFlavor(flavorName).id,
            sizes: {
              create: sizes.map(size => ({
                sizeId: size.id,
                stock: Math.floor(Math.random() * 20) + 5,
                price: Math.round(product.basePrice * parseFloat(size.name) * 100) / 100
              }))
            }
          }))
        }
      }
    });
  }

  console.log(`Products seeded successfully: ${products.length} products with ${flavorData.length} flavors and ${sizeData.length} sizes each`);
}