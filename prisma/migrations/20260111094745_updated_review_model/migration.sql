/*
  Warnings:

  - A unique constraint covering the columns `[productId,orderId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ipAddress` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_userId_fkey`;

-- DropIndex
DROP INDEX `reviews_userId_productId_key` ON `reviews`;

-- AlterTable
ALTER TABLE `files` ADD COLUMN `reviewId` INTEGER NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `adminNote` VARCHAR(191) NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NOT NULL DEFAULT '0.0.0.0',
    ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `orderId` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX `files_reviewId_idx` ON `files`(`reviewId`);

-- CreateIndex
CREATE INDEX `reviews_userId_idx` ON `reviews`(`userId`);

-- CreateIndex
CREATE INDEX `reviews_orderId_idx` ON `reviews`(`orderId`);

-- CreateIndex
CREATE INDEX `reviews_isHidden_idx` ON `reviews`(`isHidden`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_productId_orderId_key` ON `reviews`(`productId`, `orderId`);

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `reviews_productId_idx` ON `reviews`(`productId`);
DROP INDEX `reviews_productId_fkey` ON `reviews`;
