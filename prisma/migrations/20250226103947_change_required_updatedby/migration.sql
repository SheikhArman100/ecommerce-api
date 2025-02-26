/*
  Warnings:

  - The values [super_admin] on the enum `users_role` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `updatedBy` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedBy` on table `flavors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedBy` on table `sizes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `categories_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `flavors` DROP FOREIGN KEY `flavors_updatedBy_fkey`;

-- DropForeignKey
ALTER TABLE `sizes` DROP FOREIGN KEY `sizes_updatedBy_fkey`;

-- DropIndex
DROP INDEX `categories_updatedBy_fkey` ON `categories`;

-- DropIndex
DROP INDEX `flavors_updatedBy_fkey` ON `flavors`;

-- DropIndex
DROP INDEX `sizes_updatedBy_fkey` ON `sizes`;

-- AlterTable
ALTER TABLE `categories` MODIFY `updatedBy` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `flavors` MODIFY `updatedBy` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `sizes` MODIFY `updatedBy` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user';

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
