import { PrismaClient } from "@prisma/client";
import { validateAndCleanSearchTerm } from "./validate-and-clean-search-term.js";
import { filterStopWords } from "./filter-stop-words.js";
import { handleSpecialCharacterSearch } from "./handle-special-character-search.js";
import { extractYearFromQuery } from "./extract-year-from-query.js";
import { handleArtistCityYearSearch } from "./handle-artist-city-year-search.js";
import { handleArtistYearPattern } from "./handle-artist-year-pattern.js";
import { handleArtistCityPattern } from "./handle-artist-city-pattern.js";
import { handleDatePatterns } from "./handle-date-patterns.js";
import { isMultiWordCityName } from "./is-multi-word-city-name.js";
import { searchForCity } from "./search-for-city.js";
import { handleMultiArtistSearch } from "./handle-multi-artist-search.js";
import { extractDateInfo } from "./extract-date-info.js";
import { isLikelyVenueSearch } from "./is-likely-venue-search.js";
import { executeComplexSearch } from "./execute-complex-search.js";
import { executeSingleTermSearch } from "./execute-single-term-search.js";
import { searchForArtistWithYear } from "./search-for-artist-with-year.js";

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
  try {
    // Check for undefined or null search term to prevent crashes
    if (!searchTerm) {
      console.error("Search term is undefined or null");
      return [];
    }

    console.log(`Starting search for: "${searchTerm}"`);
    
    // Validate and clean the search term
    const cleanedSearchTerm = validateAndCleanSearchTerm(searchTerm);
    if (!cleanedSearchTerm) {
      return [];
    }

    // Special check for search terms with special characters like "AC/DC"
    try {
      const specialResults = await handleSpecialCharacterSearch(
        prisma,
        cleanedSearchTerm
      );
      if (specialResults.length > 0) {
        return specialResults;
      }
    } catch (error) {
      console.error("Error in handleSpecialCharacterSearch:", error);
      // Continue with other search strategies
    }

    // Filter out common stop words and get the term to use
    const termToUse = filterStopWords(cleanedSearchTerm);

    // Extract date info first - this must be done early to detect date patterns like "12/31"
    let dateInfo;
    try {
      dateInfo = extractDateInfo(termToUse);
    } catch (error) {
      console.error("Error in extractDateInfo:", error);
      dateInfo = {
        hasDate: false,
        year: null,
        month: null,
        day: null,
        searchWithoutDate: termToUse
      };
    }

    // IMPORTANT: Check for date patterns like "artist MM/DD" or "artist MM/DD/YYYY"
    // These require special handling and should be prioritized
    if (dateInfo.hasDate && dateInfo.month !== null && dateInfo.day !== null) {
      try {
        console.log(`Detected date pattern with month=${dateInfo.month + 1}, day=${dateInfo.day}, year=${dateInfo.year || 'not specified'}`);
        
        // Always try the date pattern handler first for month/day combinations
        const datePatternResults = await handleDatePatterns(prisma, termToUse);
        if (datePatternResults.length > 0) {
          console.log(`Found ${datePatternResults.length} results via date pattern search`);
          return datePatternResults;
        }
        
        console.log('No results found with date pattern search, but we have a month/day pattern so returning empty results');
        // If we have a month/day pattern but no results, don't try other search strategies
        return [];
      } catch (error) {
        console.error("Error in date pattern handling:", error);
        // Continue with other search strategies instead of returning empty results
      }
    }

    // For other types of searches, continue with the existing search logic

    // Extract query terms and check for year
    const queryTerms = termToUse.split(/\s+/).filter(Boolean);
    let yearValue, searchWithoutYear;
    try {
      const result = extractYearFromQuery(termToUse, queryTerms);
      yearValue = result.yearValue;
      searchWithoutYear = result.searchWithoutYear;
    } catch (error) {
      console.error("Error in extractYearFromQuery:", error);
      yearValue = null;
      searchWithoutYear = termToUse;
    }

    // Handle artist+city+year search pattern (e.g., "phish new york 2024")
    if (yearValue) {
      try {
        const artistCityYearResults = await handleArtistCityYearSearch(
          prisma,
          yearValue,
          searchWithoutYear
        );
        if (artistCityYearResults.length > 0) {
          return artistCityYearResults;
        }

        // Try a direct search for artist+year
        const artistYearResults = await searchForArtistWithYear(
          prisma,
          searchWithoutYear,
          yearValue,
          similarityThreshold
        );

        if (artistYearResults.length > 0) {
          return artistYearResults;
        }
      } catch (error) {
        console.error("Error handling artist+city+year search:", error);
      }
    }

    // Try other search strategies with proper error handling
    try {
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
    } catch (error) {
      console.error("Error in additional search strategies:", error);
    }

    // Use the search term without date for artist/venue matching if a date was found
    const termForMatching = dateInfo.hasDate
      ? dateInfo.searchWithoutDate
      : termToUse;

    // Check if we might have multiple terms for complex searches
    const searchTerms = termForMatching.split(/\s+/).filter(Boolean);
    const isPotentialArtistVenueSearch =
      searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);

    try {
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
      return await executeSingleTermSearch(
        prisma,
        termToUse,
        similarityThreshold
      );
    } catch (error) {
      console.error("Error in final search strategies:", error);
      return [];
    }
  } catch (error) {
    console.error("Critical error in fuzzyPosterSearch:", error);
    return [];
  }
}
