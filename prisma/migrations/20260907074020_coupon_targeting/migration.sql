-- CreateEnum
CREATE TYPE "CouponTargetType" AS ENUM ('ALL', 'NEW_USERS', 'INACTIVE_USERS', 'SPECIFIC_USERS');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "inactiveDays" INTEGER,
ADD COLUMN     "targetType" "CouponTargetType" NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "coupon_target_users" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "coupon_target_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupon_target_users_userId_idx" ON "coupon_target_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_target_users_couponId_userId_key" ON "coupon_target_users"("couponId", "userId");

-- AddForeignKey
ALTER TABLE "coupon_target_users" ADD CONSTRAINT "coupon_target_users_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_target_users" ADD CONSTRAINT "coupon_target_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
