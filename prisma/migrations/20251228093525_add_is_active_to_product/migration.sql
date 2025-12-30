-- AlterTable
ALTER TABLE `products` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `products_isActive_idx` ON `products`(`isActive`);
