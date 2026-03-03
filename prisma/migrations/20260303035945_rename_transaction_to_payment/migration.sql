/*
  Warnings:

  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_orderId_fkey`;

-- DropTable
DROP TABLE `transactions`;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` INTEGER NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paymentGateway` VARCHAR(191) NOT NULL DEFAULT 'SSLCOMMERZ',
    `gatewayResponse` JSON NULL,
    `validationResponse` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_transactionId_key`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
