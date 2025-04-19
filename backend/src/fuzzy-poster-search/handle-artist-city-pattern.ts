import { PrismaClient } from "@prisma/client";
import { searchForArtistWithCity } from "./search-for-artist-with-city.js";
import { MULTI_WORD_CITIES } from "./fuzzy-search-constants.js";
import { isMultiWordCityName } from "./is-multi-word-city-name.js";

/**
 * Handles the artist+city search pattern (e.g., "phish los angeles")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleArtistCityPattern(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const artistCityPattern = /^([a-z]+)\s+((?:[a-z]+\s+)*[a-z]+)$/i;
  const artistCityMatch = searchTerm.match(artistCityPattern);

  if (!artistCityMatch) {
    return [];
  }

  const searchTerms = searchTerm.split(/\s+/);
  // We need at least 2 words
  if (searchTerms.length < 2) {
    return [];
  }

  // Different ways to interpret artist+city combinations
  const possibleArtistCityCombinations = [];

  // Single word artist + multi-word city (e.g., "Phish Los Angeles")
  if (searchTerms.length >= 3) {
    possibleArtistCityCombinations.push({
      artist: searchTerms[0],
      city: searchTerms.slice(1).join(" "),
    });
  }

  // Multi-word artist + single word city (e.g., "Grateful Dead Seattle")
  if (searchTerms.length >= 3) {
    possibleArtistCityCombinations.push({
      artist: searchTerms.slice(0, -1).join(" "),
      city: searchTerms[searchTerms.length - 1],
    });
  }

  // For 2-word searches, try both combinations
  if (searchTerms.length === 2) {
    possibleArtistCityCombinations.push({
      artist: searchTerms[0],
      city: searchTerms[1],
    });
  }

  // If any terms match our multi-word city list, prioritize that interpretation
  if (isMultiWordCityName(searchTerm)) {
    for (const city of MULTI_WORD_CITIES) {
      if (searchTerm.toLowerCase().includes(city)) {
        const artistPart = searchTerm.toLowerCase().replace(city, "").trim();
        if (artistPart.length > 1) {
          possibleArtistCityCombinations.unshift({
            artist: artistPart,
            city: city,
          });
          break;
        }
      }
    }
  }

  // Try each combination and return the first one that finds results
  for (const combo of possibleArtistCityCombinations) {
    // Only process if we have valid artist and city strings
    if (combo.artist.length >= 2 && combo.city.length >= 2) {
      console.log(
        `Trying artist+city combination: "${combo.artist}" in "${combo.city}"`
      );

      // Call our specialized function for strict artist+city search
      const strictResults = await searchForArtistWithCity(
        prisma,
        combo.artist,
        combo.city,
        0.3 // Slightly lower threshold for better matches
      );

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results with strict artist+city search for "${combo.artist}" in "${combo.city}"`
        );
        return strictResults;
      }
    }
  }

  return [];
}
