/*
  Warnings:

  - You are about to drop the column `artist` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `condition` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `designer` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `edition` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `eventDate` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `limited` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `printType` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `venue` on the `Poster` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[defaultAddressId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `Poster` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PosterType" AS ENUM ('EVENT', 'TOUR', 'PROMO', 'ART_PRINT', 'OTHER');

-- CreateEnum
CREATE TYPE "PosterStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SHIP_TO_US', 'VERIFYING', 'VERIFIED', 'REJECTED', 'SHIP_TO_BUYER', 'DELIVERED', 'COMPLETED', 'RETURN_TO_SELLER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BID_HOLD', 'PURCHASE', 'PAYOUT', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UploadedBy" AS ENUM ('SELLER', 'VERIFIER');

-- CreateEnum
CREATE TYPE "OrderActor" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SYSTEM');

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "Poster" DROP COLUMN "artist",
DROP COLUMN "condition",
DROP COLUMN "designer",
DROP COLUMN "dimensions",
DROP COLUMN "edition",
DROP COLUMN "eventDate",
DROP COLUMN "images",
DROP COLUMN "limited",
DROP COLUMN "price",
DROP COLUMN "printType",
DROP COLUMN "venue",
ADD COLUMN     "auctionEndAt" TIMESTAMP(3),
ADD COLUMN     "buyNowPrice" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "editionNumber" TEXT,
ADD COLUMN     "heightInInches" DOUBLE PRECISION,
ADD COLUMN     "imageUrls" TEXT[],
ADD COLUMN     "isAuction" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isNumbered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" VARCHAR(1000),
ADD COLUMN     "paperType" TEXT,
ADD COLUMN     "signedByArtist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signedByMusician" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startPrice" DOUBLE PRECISION,
ADD COLUMN     "status" "PosterStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "PosterType" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "variant" TEXT,
ADD COLUMN     "widthInInches" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "password",
DROP COLUMN "profileImage",
DROP COLUMN "role",
DROP COLUMN "username",
ADD COLUMN     "defaultAddressId" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "stripeAccountId" TEXT;

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "province" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "posterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "shippingTrackingNumber" TEXT,
    "shippingCarrier" TEXT,
    "shippingTrackingNumberToBuyer" TEXT,
    "shippingCarrierToBuyer" TEXT,
    "shippingLabelUrl" TEXT,
    "shippingLabelToBuyer" TEXT,
    "sellerPayoutInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStateHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actor" "OrderActor",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationImage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "uploadedBy" "UploadedBy",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "jambaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "jambaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistGenre" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "ArtistGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "jambaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "jambaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "province" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterEvent" (
    "id" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "PosterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterArtist" (
    "id" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "PosterArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventArtist" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "EventArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bid_posterId_key" ON "Bid"("posterId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_posterId_key" ON "Order"("posterId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_jambaseId_key" ON "Genre"("jambaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_jambaseId_key" ON "Artist"("jambaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistGenre_artistId_genreId_key" ON "ArtistGenre"("artistId", "genreId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_jambaseId_key" ON "Event"("jambaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_jambaseId_key" ON "Venue"("jambaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PosterEvent_posterId_eventId_key" ON "PosterEvent"("posterId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PosterArtist_posterId_artistId_key" ON "PosterArtist"("posterId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "EventArtist_eventId_artistId_key" ON "EventArtist"("eventId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "User_defaultAddressId_key" ON "User"("defaultAddressId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultAddressId_fkey" FOREIGN KEY ("defaultAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStateHistory" ADD CONSTRAINT "OrderStateHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationImage" ADD CONSTRAINT "VerificationImage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistGenre" ADD CONSTRAINT "ArtistGenre_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistGenre" ADD CONSTRAINT "ArtistGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterEvent" ADD CONSTRAINT "PosterEvent_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterEvent" ADD CONSTRAINT "PosterEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterArtist" ADD CONSTRAINT "PosterArtist_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterArtist" ADD CONSTRAINT "PosterArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtist" ADD CONSTRAINT "EventArtist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtist" ADD CONSTRAINT "EventArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
