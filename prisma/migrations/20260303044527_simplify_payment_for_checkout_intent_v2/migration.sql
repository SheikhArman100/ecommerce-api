-- AlterTable
ALTER TABLE `payments` ADD COLUMN `checkoutPayload` JSON NULL,
    MODIFY `orderId` INTEGER NULL;
