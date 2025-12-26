-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productId_flavorId_sizeId_fkey` FOREIGN KEY (`productId`, `flavorId`, `sizeId`) REFERENCES `product_flavor_sizes`(`productId`, `flavorId`, `sizeId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_flavorId_sizeId_fkey` FOREIGN KEY (`productId`, `flavorId`, `sizeId`) REFERENCES `product_flavor_sizes`(`productId`, `flavorId`, `sizeId`) ON DELETE RESTRICT ON UPDATE CASCADE;
