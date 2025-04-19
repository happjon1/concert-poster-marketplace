import {
  VENUE_KEYWORDS,
  COMMON_CITIES,
  SPECIFIC_VENUES,
} from "./fuzzy-search-constants.js";

/**
 * Determines if a search term is likely a venue-related search
 * Checks if the term contains venue keywords or city names
 *
 * @param searchTerm - The search term to evaluate
 * @returns True if the search term appears to be venue-related
 */
export function isLikelyVenueSearch(searchTerm: string): boolean {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return false;
  }

  const lowerCaseTerm = searchTerm.toLowerCase();
  const words = lowerCaseTerm.split(/\s+/);

  // Single-word searches are unlikely to be venue searches unless it's a specific venue
  if (words.length === 1) {
    return SPECIFIC_VENUES.some(
      (venue) => lowerCaseTerm === venue.toLowerCase()
    );
  }

  // Check for venue keywords
  for (const keyword of VENUE_KEYWORDS) {
    // Make sure we're matching whole words, not parts of words
    const regexPattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (regexPattern.test(lowerCaseTerm)) {
      return true;
    }
  }

  // Check for specific venue names
  for (const venue of SPECIFIC_VENUES) {
    if (lowerCaseTerm.includes(venue.toLowerCase())) {
      return true;
    }
  }

  // Check for city names
  for (const city of COMMON_CITIES) {
    // For cities that are multi-word, we want to match the exact phrase
    // For single-word cities, we want to match whole words
    if (city.includes(" ")) {
      if (lowerCaseTerm.includes(city.toLowerCase())) {
        return true;
      }
    } else {
      const regexPattern = new RegExp(`\\b${city}\\b`, "i");
      if (regexPattern.test(lowerCaseTerm)) {
        return true;
      }
    }
  }

  return false;
}
