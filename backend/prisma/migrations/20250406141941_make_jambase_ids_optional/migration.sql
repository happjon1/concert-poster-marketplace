-- DropIndex
DROP INDEX "Artist_jambaseId_key";

-- DropIndex
DROP INDEX "Genre_jambaseId_key";

-- AlterTable
ALTER TABLE "Artist" ALTER COLUMN "jambaseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Genre" ALTER COLUMN "jambaseId" DROP NOT NULL;
