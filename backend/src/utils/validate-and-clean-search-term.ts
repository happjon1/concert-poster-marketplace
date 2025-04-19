/**
 * Validates and normalizes the search term
 * @param searchTerm - The raw search term to validate
 * @returns The cleaned search term, or null if invalid
 */
export function validateAndCleanSearchTerm(searchTerm: string): string | null {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return null;
  }

  const cleanedSearchTerm = searchTerm.trim();

  // Set a minimum character length to avoid very short search terms
  if (cleanedSearchTerm.length < 2) {
    return null;
  }

  return cleanedSearchTerm;
}
