import { MULTI_WORD_CITIES } from "./fuzzy-search-constants.js";

/**
 * Checks if the search term is likely a multi-word city name
 *
 * @param searchTerm - The search term to check
 * @returns boolean - True if the search term is likely a multi-word city name
 */
export function isMultiWordCityName(searchTerm: string): boolean {
  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check if the search matches any of our multi-word cities
  return MULTI_WORD_CITIES.some(
    (city) =>
      lowerSearchTerm === city ||
      // Also match if it's the exact city phrase plus potentially other words
      (lowerSearchTerm.includes(city) &&
        (lowerSearchTerm.indexOf(city) === 0 ||
          lowerSearchTerm.indexOf(city) > 0))
  );
}
