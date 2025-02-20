-- DropIndex
DROP INDEX `refreshTokens_token_key` ON `refreshtokens`;

-- AlterTable
ALTER TABLE `refreshtokens` MODIFY `token` TEXT NOT NULL;
