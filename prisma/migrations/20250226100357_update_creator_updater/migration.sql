/*
  Warnings:

  - Added the required column `createdBy` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `flavors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `sizes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `categories` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `createdBy` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedBy` INTEGER NULL;

-- AlterTable
ALTER TABLE `flavors` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `createdBy` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedBy` INTEGER NULL;

-- AlterTable
ALTER TABLE `sizes` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `createdBy` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedBy` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sizes` ADD CONSTRAINT `sizes_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
