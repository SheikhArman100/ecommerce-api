/*
  Warnings:

  - Added the required column `description` to the `coupons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "coupons_isFeatured_idx" ON "coupons"("isFeatured");
