/**
 * Generates potential venue terms for search
 * @param termForMatching - The term used for matching
 * @param searchTerms - The search terms split into individual words
 * @returns Array of potential venue terms
 */
export function generatePotentialVenueTerms(
  termForMatching: string,
  searchTerms: string[]
): string[] {
  const potentialVenueTerms = [];

  // Try different venue term combinations
  if (searchTerms.length >= 3) {
    potentialVenueTerms.push(searchTerms.slice(2).join(" "));
  }

  if (searchTerms.length >= 2) {
    potentialVenueTerms.push(searchTerms.slice(1).join(" "));
    potentialVenueTerms.push(searchTerms[searchTerms.length - 1]);
  }

  // For multi-word city searches, try the entire phrase as a venue city
  if (searchTerms.length >= 2) {
    potentialVenueTerms.push(termForMatching);
  }

  return potentialVenueTerms;
}
