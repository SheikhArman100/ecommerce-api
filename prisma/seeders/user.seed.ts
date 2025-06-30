import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedUsers() {
  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash('123456', saltRounds);

  const users = [
    {
      name: 'Sheikh Arman',
      email: 'sheikharman@softograph.com',
      phoneNumber: '+1234567890',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.admin
    },
    {
      name: 'Amanullah Aman',
      email: 'aman@softograph.com',
      phoneNumber: '+1234567890',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.admin
    },
    {
      name: 'Demo User',
      email: 'demo@softograph.com',
      phoneNumber: '+1234567890',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.user,
      detail: {
        create: {
          address: '123 Main St',
          city: 'New York',
          road: 'Broadway'
        }
      }
    }
    
    
    
    
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    });
  }

  console.log('Users seeded successfully');
}