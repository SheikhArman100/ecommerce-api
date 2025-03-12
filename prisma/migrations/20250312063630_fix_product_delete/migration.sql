-- DropForeignKey
ALTER TABLE `wishlists` DROP FOREIGN KEY `wishlists_productId_fkey`;

-- DropIndex
DROP INDEX `wishlists_productId_fkey` ON `wishlists`;

-- AddForeignKey
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
