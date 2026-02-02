-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_productId_fkey`;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `flavorName` VARCHAR(191) NULL,
    ADD COLUMN `productTitle` VARCHAR(191) NULL,
    ADD COLUMN `sizeName` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
