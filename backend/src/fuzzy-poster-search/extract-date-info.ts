import { MONTH_NAMES } from "./fuzzy-search-constants.js";

/**
 * Extract date information from search term
 * This helps identify searches with year components
 *
 * @param searchTerm - The search term to extract date information from
 * @returns Object with date information and search term without date
 */
export function extractDateInfo(searchTerm: string): {
  hasDate: boolean;
  year: number | null;
  month: number | null;
  day: number | null;
  searchWithoutDate: string;
} {
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let searchWithoutDate = searchTerm;
  let hasDate = false;

  // Look for year pattern like "2023" or "2023" at word boundaries
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const yearMatches = searchTerm.match(yearPattern);

  if (yearMatches && yearMatches.length > 0) {
    year = parseInt(yearMatches[0], 10);
    hasDate = true;

    // Remove the year from the search term
    searchWithoutDate = searchTerm.replace(yearPattern, "").trim();
  }

  // Look for month names
  const monthPattern = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\b`, "i");
  const monthMatch = searchTerm.match(monthPattern);

  if (monthMatch) {
    const monthName = monthMatch[0].toLowerCase();
    month = MONTH_NAMES.indexOf(monthName);
    if (month !== -1) {
      hasDate = true;
      // Remove the month from the search term
      searchWithoutDate = searchWithoutDate.replace(monthPattern, "").trim();
    }
  }

  return {
    hasDate,
    year,
    month,
    day,
    searchWithoutDate,
  };
}
