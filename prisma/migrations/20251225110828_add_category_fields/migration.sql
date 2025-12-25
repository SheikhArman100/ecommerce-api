/*
  Warnings:

  - You are about to drop the `images` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `images` DROP FOREIGN KEY `images_productId_flavorId_fkey`;

-- DropForeignKey
ALTER TABLE `images` DROP FOREIGN KEY `images_userDetailId_fkey`;

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `image` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    MODIFY `updatedBy` INTEGER NULL;

-- AlterTable
ALTER TABLE `refreshtokens` ADD COLUMN `ipAddress` VARCHAR(191) NOT NULL DEFAULT '0.0.0.0';

-- AlterTable
ALTER TABLE `users` ADD COLUMN `createdBy` INTEGER NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `updatedBy` INTEGER NULL;

-- DropTable
DROP TABLE `images`;

-- CreateTable
CREATE TABLE `files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER') NOT NULL DEFAULT 'IMAGE',
    `diskType` ENUM('LOCAL', 'AWS', 'SHARED') NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `modifiedName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `productId` INTEGER NULL,
    `flavorId` INTEGER NULL,
    `userDetailId` INTEGER NULL,

    UNIQUE INDEX `files_userDetailId_key`(`userDetailId`),
    UNIQUE INDEX `files_id_productId_flavorId_key`(`id`, `productId`, `flavorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `categories_slug_key` ON `categories`(`slug`);

-- CreateIndex
CREATE INDEX `categories_isActive_idx` ON `categories`(`isActive`);

-- CreateIndex
CREATE INDEX `categories_displayOrder_idx` ON `categories`(`displayOrder`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_productId_flavorId_fkey` FOREIGN KEY (`productId`, `flavorId`) REFERENCES `productFlavors`(`productId`, `flavorId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_userDetailId_fkey` FOREIGN KEY (`userDetailId`) REFERENCES `userDetails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
