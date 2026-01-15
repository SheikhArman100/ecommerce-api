-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_cartId_fkey`;

-- DropIndex
DROP INDEX `cart_items_cartId_productId_flavorId_sizeId_key` ON `cart_items`;

-- AlterTable
ALTER TABLE `reviews` ALTER COLUMN `ipAddress` DROP DEFAULT,
    ALTER COLUMN `orderId` DROP DEFAULT;

-- AddForeignKey
-- ALTER TABLE `users` ADD CONSTRAINT `users_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
