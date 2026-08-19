/*
  Warnings:

  - You are about to drop the column `templateId` on the `Recording` table. All the data in the column will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Recording" DROP CONSTRAINT "Recording_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_ownerId_fkey";

-- AlterTable
ALTER TABLE "Recording" DROP COLUMN "templateId";

-- DropTable
DROP TABLE "Template";

-- DropEnum
DROP TYPE "TemplatePosition";

-- DropEnum
DROP TYPE "TemplateShape";
