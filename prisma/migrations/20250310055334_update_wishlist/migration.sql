/*
  Warnings:

  - Added the required column `updatedAt` to the `wishlists` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `wishlists` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;
