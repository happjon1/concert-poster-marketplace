import { VENUE_KEYWORDS, COMMON_CITIES, SPECIFIC_VENUES } from "./fuzzy-search-constants";

/**
 * Checks if a search term likely contains a venue reference
 * This is used to distinguish between multi-word artist names like "Flying Lotus"
 * and artist+venue searches like "Grateful Dead Seattle"
 *
 * @param searchTerm - The search term to check
 * @returns boolean - True if the search term likely contains a venue reference
 */
export function isLikelyVenueSearch(searchTerm: string): boolean {
  if (!searchTerm) return false;

  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check for specific venue names first
  if (SPECIFIC_VENUES.some((venue) => lowerSearchTerm.includes(venue))) {
    return true;
  }

  // Function to check if a word is contained as a whole word in the search term
  const containsWholeWord = (word: string, text: string): boolean => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedWord}\\b`, "i");
    return regex.test(text);
  };

  // Check for compound venue names with multiple keywords
  // Example: "red rocks" contains "rocks" which is a venue keyword
  const words = lowerSearchTerm.split(/\s+/);
  if (words.length > 1) {
    // Check if any word in the search is a venue keyword
    for (const word of words) {
      if (VENUE_KEYWORDS.includes(word)) {
        return true;
      }
    }
  }

  // Check if the search term contains any venue keywords or city names as whole words
  return (
    VENUE_KEYWORDS.some((keyword) =>
      containsWholeWord(keyword, lowerSearchTerm)
    ) || COMMON_CITIES.some((city) => lowerSearchTerm.includes(city))
  );
}
