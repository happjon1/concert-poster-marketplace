import { PrismaClient } from "@prisma/client";
import { extractDateInfo } from "./extract-date-info";
import { searchForArtistWithYear } from "./search-for-artist-with-year";

/**
 * Handles date patterns in the search (using extractDateInfo)
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleDatePatterns(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const dateInfo = extractDateInfo(searchTerm);

  if (
    !dateInfo.hasDate ||
    !dateInfo.year ||
    dateInfo.searchWithoutDate.trim().length === 0
  ) {
    return [];
  }

  const artistName = dateInfo.searchWithoutDate.trim();
  const year = dateInfo.year;

  // Try a strict AND search for artist+year combo
  const strictResults = await searchForArtistWithYear(
    prisma,
    artistName,
    year,
    0.3
  );

  if (strictResults.length > 0) {
    console.log(
      `Found ${strictResults.length} results with strict artist+year search for "${artistName} ${year}"`
    );
    return strictResults;
  }

  return [];
}
