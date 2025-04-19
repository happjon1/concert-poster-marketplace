import { PrismaClient } from "@prisma/client";
import { searchForSingleArtist } from "./search-for-single-artist";

/**
 * Handles multi-artist searches with "OR" (e.g., "Artist1 OR Artist2")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @param similarityThreshold - Minimum similarity threshold
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleMultiArtistSearch(
  prisma: PrismaClient,
  searchTerm: string,
  similarityThreshold: number
): Promise<number[]> {
  if (!searchTerm.toLowerCase().includes(" or ")) {
    return [];
  }

  // Split by "OR" to get individual artist names
  const artistNames = searchTerm
    .split(/\s+or\s+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  if (artistNames.length < 2) {
    return [];
  }

  // For multi-artist searches, search for each artist separately and combine the results
  const artistResults = await Promise.all(
    artistNames.map((artist) =>
      searchForSingleArtist(prisma, artist, similarityThreshold)
    )
  );

  // Combine results from all artists
  const combinedResults = [...new Set(artistResults.flat())];
  return combinedResults;
}
