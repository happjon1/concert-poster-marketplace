import { PrismaClient } from "@prisma/client";
import { validateAndCleanSearchTerm } from "./validate-and-clean-search-term";
import { filterStopWords } from "./filter-stop-words";
import { handleSpecialCharacterSearch } from "./handle-special-character-search";
import { extractYearFromQuery } from "./extract-year-from-query";
import { handleArtistCityYearSearch } from "./handle-artist-city-year-search";
import { handleArtistYearPattern } from "./handle-artist-year-pattern";
import { handleArtistCityPattern } from "./handle-artist-city-pattern";
import { handleDatePatterns } from "./handle-date-patterns";
import { isMultiWordCityName } from "./is-multi-word-city-name";
import { searchForCity } from "./search-for-city";
import { handleMultiArtistSearch } from "./handle-multi-artist-search";
import { extractDateInfo } from "./extract-date-info";
import { isLikelyVenueSearch } from "./is-likely-venue-search";
import { executeComplexSearch } from "./execute-complex-search";
import { executeSingleTermSearch } from "./execute-single-term-search";

/**
 * Performs a fuzzy search on posters using PostgreSQL's trigram similarity.
 * This function searches across poster titles, descriptions, artist names, and event details.
 * Enhanced to better handle searches like "Phish 2003", "Pearl Jam 10/31/2023", "Grateful Dead Madison Square Garden"
 * Now requires that multi-part searches like "Grateful Dead Seattle" match all components (AND condition).
 * Filters out common stop words like "OR", "AND", "THE" from search queries.
 *
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to use for fuzzy matching
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.35)
 * @returns Array of poster IDs that match the search criteria
 */
export async function fuzzyPosterSearch(
  prisma: PrismaClient,
  searchTerm: string,
  similarityThreshold: number = 0.35
): Promise<number[]> {
  // Validate and clean the search term
  const cleanedSearchTerm = validateAndCleanSearchTerm(searchTerm);
  if (!cleanedSearchTerm) {
    return [];
  }

  // Special check for search terms with special characters like "AC/DC"
  const specialResults = await handleSpecialCharacterSearch(
    prisma,
    cleanedSearchTerm
  );
  if (specialResults.length > 0) {
    return specialResults;
  }

  // Filter out common stop words and get the term to use
  const termToUse = filterStopWords(cleanedSearchTerm);

  // Extract query terms and check for year
  const queryTerms = termToUse.split(/\s+/).filter(Boolean);
  const { yearValue, searchWithoutYear } = extractYearFromQuery(
    termToUse,
    queryTerms
  );

  // Handle artist+city+year search pattern (e.g., "phish new york 2024")
  const artistCityYearResults = await handleArtistCityYearSearch(
    prisma,
    yearValue,
    searchWithoutYear
  );
  if (artistCityYearResults.length > 0) {
    return artistCityYearResults;
  }

  // Handle artist+year search pattern (e.g., "phish 2023")
  const artistYearResults = await handleArtistYearPattern(prisma, termToUse);
  if (artistYearResults.length > 0) {
    return artistYearResults;
  }

  // Handle artist+city search pattern (e.g., "phish los angeles")
  const artistCityResults = await handleArtistCityPattern(prisma, termToUse);
  if (artistCityResults.length > 0) {
    return artistCityResults;
  }

  // Handle date patterns (for more complex date formats)
  const datePatternResults = await handleDatePatterns(prisma, termToUse);
  if (datePatternResults.length > 0) {
    return datePatternResults;
  }

  // Check for multi-word city searches (e.g., "New York", "San Francisco")
  if (isMultiWordCityName(termToUse)) {
    return await searchForCity(prisma, termToUse, similarityThreshold);
  }

  // Handle multi-artist searches with "OR" (e.g., "Artist1 OR Artist2")
  const multiArtistResults = await handleMultiArtistSearch(
    prisma,
    cleanedSearchTerm,
    similarityThreshold
  );
  if (multiArtistResults.length > 0) {
    return multiArtistResults;
  }

  // Extract date info for remaining search logic
  const dateInfo = extractDateInfo(termToUse);

  // Use the search term without date for artist/venue matching if a date was found
  const termForMatching = dateInfo.hasDate
    ? dateInfo.searchWithoutDate
    : termToUse;

  // Check if we might have multiple terms for complex searches
  const searchTerms = termForMatching.split(/\s+/).filter(Boolean);
  const isPotentialArtistVenueSearch =
    searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);

  // For multi-term searches or searches with dates, use our enhanced approach
  if (
    (searchTerms.length > 1 && isPotentialArtistVenueSearch) ||
    dateInfo.hasDate
  ) {
    return await executeComplexSearch(
      prisma,
      termToUse,
      dateInfo,
      searchTerms,
      termForMatching,
      similarityThreshold
    );
  }

  // For single-term searches, use a simpler approach
  return await executeSingleTermSearch(prisma, termToUse, similarityThreshold);
}
