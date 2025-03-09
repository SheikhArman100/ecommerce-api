/*
  Warnings:

  - You are about to drop the column `image` on the `userdetails` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userDetailId]` on the table `images` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `images` ADD COLUMN `userDetailId` INTEGER NULL,
    MODIFY `productId` INTEGER NULL,
    MODIFY `flavorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `userdetails` DROP COLUMN `image`;

-- CreateIndex
CREATE UNIQUE INDEX `images_userDetailId_key` ON `images`(`userDetailId`);

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_userDetailId_fkey` FOREIGN KEY (`userDetailId`) REFERENCES `userDetails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
