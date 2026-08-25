
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../src/generated/enums';
import { prisma } from '../../src/client';



export async function seedUsers() {
  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash('123456', saltRounds);

  const users = [
    {
      name: 'Sheikh Arman',
      email: 'sheikharman100@gmail.com',
      phoneNumber: '+1234567890',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.admin
    },
    {
      name: 'Demo User',
      email: 'sheikharman69@gmail.com',
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
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: user
      });
    } else {
      console.log(`User ${user.email} already exists, skipping...`);
    }
  }

  console.log('Users seeded successfully');
}
