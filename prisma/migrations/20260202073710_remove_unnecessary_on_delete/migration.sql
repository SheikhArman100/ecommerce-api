-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `categories_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `categories_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `flavors` DROP FOREIGN KEY `flavors_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `flavors` DROP FOREIGN KEY `flavors_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_productId_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_userId_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `sizes` DROP FOREIGN KEY `sizes_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `sizes` DROP FOREIGN KEY `sizes_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_updatedBy_fkey`;

-- DropIndex
DROP INDEX `categories_createdBy_fkey` ON `categories`;

-- DropIndex
DROP INDEX `categories_updatedBy_fkey` ON `categories`;

-- DropIndex
DROP INDEX `flavors_createdBy_fkey` ON `flavors`;

-- DropIndex
DROP INDEX `flavors_updatedBy_fkey` ON `flavors`;

-- DropIndex
DROP INDEX `orders_userId_fkey` ON `orders`;

-- DropIndex
DROP INDEX `products_categoryId_fkey` ON `products`;

-- DropIndex
DROP INDEX `products_createdBy_fkey` ON `products`;

-- DropIndex
DROP INDEX `products_updatedBy_fkey` ON `products`;

-- DropIndex
DROP INDEX `sizes_createdBy_fkey` ON `sizes`;

-- DropIndex
DROP INDEX `sizes_updatedBy_fkey` ON `sizes`;

-- DropIndex
DROP INDEX `users_createdBy_fkey` ON `users`;

-- DropIndex
DROP INDEX `users_updatedBy_fkey` ON `users`;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
