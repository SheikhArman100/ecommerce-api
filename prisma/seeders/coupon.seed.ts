import { prisma } from '../../src/client';

export async function seedCoupons() {
  console.log('Seeding coupons...');

  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (!admin) {
    console.log('Admin user not found. Skipping coupon seeding.');
    return;
  }

  const coupons = [
    {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 500,
      expiryDate: new Date('2026-12-31'),
      isActive: true,
      usageLimit: 0, // Unlimited
      createdBy: admin.id,
      updatedBy: admin.id,
    },
    {
      code: 'FLAT50',
      discountType: 'FIXED',
      discountValue: 50,
      minOrderAmount: 200,
      expiryDate: new Date('2026-06-30'),
      isActive: true,
      usageLimit: 100,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
    {
      code: 'FREESHIP',
      discountType: 'FIXED',
      discountValue: 60, // Assuming shipping cost is 60
      minOrderAmount: 1000,
      expiryDate: new Date('2026-12-31'),
      isActive: true,
      usageLimit: 0,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
    {
      code: 'EXPIRED20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 100,
      expiryDate: new Date('2024-01-01'),
      isActive: true,
      usageLimit: 50,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
  }

  console.log('Coupons seeded successfully');
}
