/*
  Warnings:

  - The primary key for the `product_flavor_sizes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[productId,flavorId,sizeId]` on the table `product_flavor_sizes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `product_flavor_sizes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `product_flavor_sizes` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `soldByQuantity` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `sizeId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `product_flavor_sizes_productId_flavorId_sizeId_key` ON `product_flavor_sizes`(`productId`, `flavorId`, `sizeId`);
