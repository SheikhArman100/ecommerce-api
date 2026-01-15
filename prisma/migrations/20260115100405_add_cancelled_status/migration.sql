-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('Pending', 'Shipped', 'Delivered', 'Canceled') NOT NULL DEFAULT 'Pending';

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
