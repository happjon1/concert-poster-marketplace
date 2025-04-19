import { VENUE_KEYWORDS, COMMON_CITIES } from "./fuzzy-search-constants";

/**
 * Checks if a search term likely contains a venue reference
 * This is used to distinguish between multi-word artist names like "Flying Lotus"
 * and artist+venue searches like "Grateful Dead Seattle"
 *
 * @param searchTerm - The search term to check
 * @returns boolean - True if the search term likely contains a venue reference
 */
export function isLikelyVenueSearch(searchTerm: string): boolean {
  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check if the search term contains any venue keywords or city names
  return (
    VENUE_KEYWORDS.some((keyword) => lowerSearchTerm.includes(keyword)) ||
    COMMON_CITIES.some((city) => lowerSearchTerm.includes(city))
  );
}
