-- CreateEnum
CREATE TYPE "ProductUses" AS ENUM ('CASUAL', 'DATES', 'PARTIES', 'OFFICE', 'TRAVEL', 'SPORTS', 'FORMALS');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productUses" "ProductUses"[] DEFAULT ARRAY[]::"ProductUses"[];
