import { MULTI_WORD_CITIES } from "./fuzzy-search-constants";
import { isMultiWordCityName } from "./is-multi-word-city-name";

/**
 * Generates possible artist-city combinations for a search without year
 * @param searchWithoutYear - The search string with any year value removed
 * @returns Array of possible artist-city combinations
 */
export function generateArtistCityCombinations(
  searchWithoutYear: string
): Array<{ artist: string; city: string }> {
  const remainingTerms = searchWithoutYear.split(/\s+/);
  const possibleCombinations = [];

  // Try last word as city, rest as artist
  if (remainingTerms.length >= 2) {
    possibleCombinations.push({
      artist: remainingTerms.slice(0, -1).join(" "),
      city: remainingTerms[remainingTerms.length - 1],
    });
  }

  // Try first word as artist, rest as city
  if (remainingTerms.length >= 2) {
    possibleCombinations.push({
      artist: remainingTerms[0],
      city: remainingTerms.slice(1).join(" "),
    });
  }

  // Check for multi-word cities
  const lowerSearchTerm = searchWithoutYear.toLowerCase();

  if (isMultiWordCityName(searchWithoutYear)) {
    for (const city of MULTI_WORD_CITIES) {
      if (lowerSearchTerm.includes(city)) {
        const artistPart = lowerSearchTerm.replace(city, "").trim();
        if (artistPart.length > 1) {
          possibleCombinations.unshift({
            artist: artistPart,
            city: city,
          });
        }
      }
    }
  }

  return possibleCombinations;
}
