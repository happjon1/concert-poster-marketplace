/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First, add the column as nullable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Then, update existing users with a temporary password hash
-- This is a bcrypt hash for 'changeme123'
UPDATE "User" SET "passwordHash" = '$2b$10$MK7OWLIRUv76vFQcLWxsE.g0qlc.iFEmkW9kRdQllKz9M5TvOl.qq' WHERE "passwordHash" IS NULL;

-- Finally, make the column required
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- Add the reset password fields and last login (these should work fine)
ALTER TABLE "User" ADD COLUMN "resetPasswordToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetPasswordExpires" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "lastLogin" TIMESTAMP;
