/*
  Warnings:

  - The primary key for the `Bid` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Bid` table. All the data in the column will be lost.
  - The `id` column on the `Bid` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `amount` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - The primary key for the `Poster` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Poster` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `posterId` on the `Bid` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `posterId` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `posterId` on the `PosterArtist` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `posterId` on the `PosterEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_posterId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_posterId_fkey";

-- DropForeignKey
ALTER TABLE "PosterArtist" DROP CONSTRAINT "PosterArtist_posterId_fkey";

-- DropForeignKey
ALTER TABLE "PosterEvent" DROP CONSTRAINT "PosterEvent_posterId_fkey";

-- DropIndex
DROP INDEX "Bid_posterId_key";

-- AlterTable
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
DROP COLUMN "posterId",
ADD COLUMN     "posterId" INTEGER NOT NULL,
ADD CONSTRAINT "Bid_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "posterId",
ADD COLUMN     "posterId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Poster" DROP CONSTRAINT "Poster_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Poster_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PosterArtist" DROP COLUMN "posterId",
ADD COLUMN     "posterId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PosterEvent" DROP COLUMN "posterId",
ADD COLUMN     "posterId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_posterId_key" ON "Order"("posterId");

-- CreateIndex
CREATE UNIQUE INDEX "PosterArtist_posterId_artistId_key" ON "PosterArtist"("posterId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "PosterEvent_posterId_eventId_key" ON "PosterEvent"("posterId", "eventId");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterEvent" ADD CONSTRAINT "PosterEvent_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterArtist" ADD CONSTRAINT "PosterArtist_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
