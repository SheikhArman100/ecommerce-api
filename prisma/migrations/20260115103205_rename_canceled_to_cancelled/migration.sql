/*
  Warnings:

  - The values [Canceled] on the enum `orders_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending';
