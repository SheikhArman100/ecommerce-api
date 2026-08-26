
import { seedUsers } from './user.seed';
import { prisma } from '../../src/client';

async function main() {
  try {
    // Seed users only
    await seedUsers();

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
