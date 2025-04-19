import { PrismaClient } from "@prisma/client";
import { isLikelyVenueSearch } from "./is-likely-venue-search.js";
import { executeComplexSearchQuery } from "./execute-complex-search-query.js";
import { generatePotentialArtistTerms } from "./generate-potential-artist-terms.js";
import { generatePotentialVenueTerms } from "./generate-potential-venue-terms.js";

/**
 * Generates SQL for complex multi-term searches
 * @param prisma - PrismaClient instance
 * @param termToUse - The main search term
 * @param dateInfo - Date information extracted from the search
 * @param searchTerms - The search split into terms
 * @param termForMatching - The search term to use for matching (may have date removed)
 * @param similarityThreshold - Similarity threshold for matches
 * @returns Array of matching poster IDs
 */
export async function executeComplexSearch(
  prisma: PrismaClient,
  termToUse: string,
  dateInfo: any,
  searchTerms: string[],
  termForMatching: string,
  similarityThreshold: number
): Promise<number[]> {
  // Higher threshold for artist names to reduce false positives
  const artistSimilarityThreshold = 0.3;

  // Threshold for venue city matches to catch geographic searches
  const venueSimilarityThreshold = 0.2;

  // For searches like "Grateful Dead Seattle", we want special handling
  const isPotentialArtistVenueSearch =
    searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);

  // Parse possible artist and venue terms
  const potentialArtistTerms = generatePotentialArtistTerms(
    termForMatching,
    searchTerms,
    isPotentialArtistVenueSearch
  );
  const potentialVenueTerms = generatePotentialVenueTerms(
    termForMatching,
    searchTerms
  );

  // For multi-word artist names - special handling when it looks like just an artist name
  const isLikelyArtistNameOnly =
    searchTerms.length === 2 && !isPotentialArtistVenueSearch;

  // Execute the complex SQL query
  const result = await executeComplexSearchQuery(
    prisma,
    termToUse,
    termForMatching,
    dateInfo,
    potentialArtistTerms,
    potentialVenueTerms,
    searchTerms,
    isPotentialArtistVenueSearch,
    isLikelyArtistNameOnly,
    similarityThreshold,
    artistSimilarityThreshold,
    venueSimilarityThreshold
  );

  // Extract poster IDs from the result
  return result.map((row: any) => row.id);
}
