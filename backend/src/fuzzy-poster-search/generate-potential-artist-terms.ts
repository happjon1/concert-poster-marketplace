/**
 * Generates potential artist terms for search
 * @param termForMatching - The term used for matching
 * @param searchTerms - The search split into individual terms
 * @param isPotentialArtistVenueSearch - Whether this might be an artist+venue search
 * @returns Array of potential artist terms
 */
export function generatePotentialArtistTerms(
  termForMatching: string,
  searchTerms: string[],
  isPotentialArtistVenueSearch: boolean
): string[] {
  const potentialArtistTerms = [];

  // Try full terms as artist name (handles cases like "Grateful Dead" or "Red Hot Chili Peppers")
  potentialArtistTerms.push(termForMatching);

  // Try first two words as artist, rest as venue (handles "Grateful Dead Seattle")
  if (searchTerms.length >= 3) {
    potentialArtistTerms.push(searchTerms.slice(0, 2).join(" "));
  }

  // Try first word as artist, rest as venue (handles "Phish Madison")
  if (searchTerms.length >= 2) {
    potentialArtistTerms.push(searchTerms[0]);
  }

  // Try last word as venue, rest as artist (handles "Grateful Dead Seattle")
  if (searchTerms.length >= 2) {
    potentialArtistTerms.push(searchTerms.slice(0, -1).join(" "));
  }

  // When searching for multiple artists (like in "Phish Grateful Dead" after removing "OR"),
  // add individual terms as separate artist searches
  if (searchTerms.length > 1 && !isPotentialArtistVenueSearch) {
    searchTerms.forEach((term) => {
      if (term.length > 1) {
        potentialArtistTerms.push(term);
      }
    });
  }

  return potentialArtistTerms;
}
