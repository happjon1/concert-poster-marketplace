import { STOP_WORDS } from "./fuzzy-search-constants";

/**
 * Filters out common stop words from a search term
 * @param searchTerm - The search term to filter
 * @returns The filtered search term
 */
export function filterStopWords(searchTerm: string): string {
  const filteredSearchTerm = searchTerm
    .split(/\s+/)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()) && word.length > 1)
    .join(" ");

  // If all words were filtered out, use the original term
  return filteredSearchTerm.length > 1 ? filteredSearchTerm : searchTerm;
}
