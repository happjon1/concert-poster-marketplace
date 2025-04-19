/**
 * Extracts year from search query terms
 * @param searchTerm - The full search term
 * @param queryTerms - The search query split into terms
 * @returns An object with the year value and search term without the year
 */
export function extractYearFromQuery(
  searchTerm: string,
  queryTerms: string[]
): { yearValue: number | null; searchWithoutYear: string } {
  const yearPattern = /\b(19|20)\d{2}\b/;
  let yearValue = null;
  let searchWithoutYear = searchTerm;

  // Extract year if present
  for (const term of queryTerms) {
    const match = term.match(yearPattern);
    if (match) {
      yearValue = parseInt(match[0], 10);
      searchWithoutYear = searchTerm.replace(yearPattern, "").trim();
      break;
    }
  }

  return { yearValue, searchWithoutYear };
}
