/*
  Warnings:

  - You are about to drop the column `date` on the `Event` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDay` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startMonth` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startYear` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the new columns as nullable
ALTER TABLE "Event" 
ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "startYear" INTEGER,
ADD COLUMN IF NOT EXISTS "startMonth" INTEGER,
ADD COLUMN IF NOT EXISTS "startDay" INTEGER,
ADD COLUMN IF NOT EXISTS "endYear" INTEGER,
ADD COLUMN IF NOT EXISTS "endMonth" INTEGER,
ADD COLUMN IF NOT EXISTS "endDay" INTEGER;

-- Add default values for required fields, in case we're on a fresh database
ALTER TABLE "Event" ALTER COLUMN "startDate" SET DEFAULT NOW();
ALTER TABLE "Event" ALTER COLUMN "startYear" SET DEFAULT EXTRACT(YEAR FROM NOW());
ALTER TABLE "Event" ALTER COLUMN "startMonth" SET DEFAULT EXTRACT(MONTH FROM NOW());
ALTER TABLE "Event" ALTER COLUMN "startDay" SET DEFAULT EXTRACT(DAY FROM NOW());

-- Populate the new fields using data from the existing date field (if it exists)
-- Using a safer approach that handles NULL values and checks if column exists
DO $$ 
BEGIN
    -- Check if date column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Event' AND column_name = 'date') THEN
        -- Update non-NULL date entries
        UPDATE "Event"
        SET 
          "startDate" = "date",
          "startYear" = EXTRACT(YEAR FROM "date"),
          "startMonth" = EXTRACT(MONTH FROM "date"),
          "startDay" = EXTRACT(DAY FROM "date")
        WHERE "date" IS NOT NULL;
    END IF;
END $$;

-- Now make the required fields non-nullable
ALTER TABLE "Event" 
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "startYear" SET NOT NULL,
ALTER COLUMN "startMonth" SET NOT NULL,
ALTER COLUMN "startDay" SET NOT NULL;

-- Drop the defaults since we don't need them anymore
ALTER TABLE "Event" ALTER COLUMN "startDate" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "startYear" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "startMonth" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "startDay" DROP DEFAULT;

-- Finally, drop the old date column if it exists
DO $$ 
BEGIN
    -- Check if date column exists before attempting to drop it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Event' AND column_name = 'date') THEN
        ALTER TABLE "Event" DROP COLUMN "date";
    END IF;
END $$;
