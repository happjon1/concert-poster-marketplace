import { PrismaClient } from "@prisma/client";
import { searchForArtistWithYear } from "./search-for-artist-with-year.js";

/**
 * Handles the artist+year search pattern (e.g., "phish 2023")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleArtistYearPattern(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const artistYearPattern = /^([a-z\s]+)\s+(19|20)\d{2}$/i;
  const artistYearMatch = searchTerm.match(artistYearPattern);

  if (!artistYearMatch) {
    return [];
  }

  const artistName = artistYearMatch[1].trim();
  const year = parseInt(artistYearMatch[2], 10);

  // Artist name should be at least 2 characters
  if (artistName.length < 2) {
    return [];
  }

  console.log(`Detected artist+year pattern: "${artistName}" and year ${year}`);

  // Use strict artist+year search with AND logic
  const strictResults = await searchForArtistWithYear(
    prisma,
    artistName,
    year,
    0.3 // Slightly lower threshold for better matches
  );

  if (strictResults.length > 0) {
    console.log(
      `Found ${strictResults.length} results with strict artist+year search`
    );
    return strictResults;
  }

  return [];
}
