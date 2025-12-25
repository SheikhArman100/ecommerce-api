/*
  Warnings:

  - You are about to drop the column `image` on the `categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[categoryId]` on the table `files` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_productId_fkey`;

-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_productId_flavorId_sizeId_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_productId_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_productId_flavorId_sizeId_fkey`;

-- DropForeignKey
ALTER TABLE `product_flavor_sizes` DROP FOREIGN KEY `product_flavor_sizes_productId_flavorId_fkey`;

-- DropForeignKey
ALTER TABLE `product_flavor_sizes` DROP FOREIGN KEY `product_flavor_sizes_sizeId_fkey`;

-- DropForeignKey
ALTER TABLE `productflavors` DROP FOREIGN KEY `productFlavors_flavorId_fkey`;

-- DropForeignKey
ALTER TABLE `productflavors` DROP FOREIGN KEY `productFlavors_productId_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_categoryId_fkey`;

-- DropIndex
DROP INDEX `cart_items_productId_flavorId_sizeId_fkey` ON `cart_items`;

-- DropIndex
DROP INDEX `order_items_productId_flavorId_sizeId_fkey` ON `order_items`;

-- DropIndex
DROP INDEX `product_flavor_sizes_sizeId_fkey` ON `product_flavor_sizes`;

-- DropIndex
DROP INDEX `productFlavors_flavorId_fkey` ON `productflavors`;

-- DropIndex
DROP INDEX `products_categoryId_fkey` ON `products`;

-- AlterTable
ALTER TABLE `categories` DROP COLUMN `image`;

-- AlterTable
ALTER TABLE `files` ADD COLUMN `categoryId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `files_categoryId_key` ON `files`(`categoryId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productFlavors` ADD CONSTRAINT `productFlavors_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productFlavors` ADD CONSTRAINT `productFlavors_flavorId_fkey` FOREIGN KEY (`flavorId`) REFERENCES `flavors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_flavor_sizes` ADD CONSTRAINT `product_flavor_sizes_productId_flavorId_fkey` FOREIGN KEY (`productId`, `flavorId`) REFERENCES `productFlavors`(`productId`, `flavorId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_flavor_sizes` ADD CONSTRAINT `product_flavor_sizes_sizeId_fkey` FOREIGN KEY (`sizeId`) REFERENCES `sizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productId_flavorId_sizeId_fkey` FOREIGN KEY (`productId`, `flavorId`, `sizeId`) REFERENCES `product_flavor_sizes`(`productId`, `flavorId`, `sizeId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_flavorId_sizeId_fkey` FOREIGN KEY (`productId`, `flavorId`, `sizeId`) REFERENCES `product_flavor_sizes`(`productId`, `flavorId`, `sizeId`) ON DELETE RESTRICT ON UPDATE CASCADE;
