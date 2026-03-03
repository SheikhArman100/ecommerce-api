/*
  Warnings:

  - You are about to drop the column `checkoutPayload` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - Made the column `orderId` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_userId_fkey`;

-- DropIndex
DROP INDEX `payments_orderId_fkey` ON `payments`;

-- DropIndex
DROP INDEX `payments_userId_fkey` ON `payments`;

-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Failed') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `checkoutPayload`,
    DROP COLUMN `userId`,
    MODIFY `orderId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
