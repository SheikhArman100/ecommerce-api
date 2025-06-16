import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedUsers() {
  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash('123456', saltRounds);

  const users = [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      phoneNumber: '+1234567890',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.admin
    },
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
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
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '+1234567891',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.user,
      detail: {
        create: {
          address: '456 Oak Ave',
          city: 'Los Angeles',
          road: 'Sunset Blvd'
        }
      }
    },
    {
      name: 'Mike Wilson',
      email: 'mike.wilson@example.com',
      phoneNumber: '+1234567892',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.admin,
      detail: {
        create: {
          address: '789 Pine St',
          city: 'Chicago',
          road: 'Michigan Ave'
        }
      }
    },
    {
      name: 'Sarah Brown',
      email: 'sarah.brown@example.com',
      phoneNumber: '+1234567893',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.user,
      detail: {
        create: {
          address: '321 Elm St',
          city: 'Houston',
          road: 'Main St'
        }
      }
    },
    {
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      phoneNumber: '+1234567894',
      password: defaultPassword,
      isVerified: true,
      role: UserRole.user,
      detail: {
        create: {
          address: '654 Maple Dr',
          city: 'Phoenix',
          road: 'Central Ave'
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