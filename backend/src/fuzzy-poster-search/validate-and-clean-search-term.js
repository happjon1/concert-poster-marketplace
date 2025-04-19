/**
 * Validates and cleans a search term.
 * - Trims leading and trailing whitespace
 * - Returns null for null/undefined/empty inputs
 * - Ensures search terms are at least 2 characters long
 *
 * @param {string} searchTerm - The search term to validate and clean
 * @returns {string|null} The cleaned search term or null if invalid
 */
export function validateAndCleanSearchTerm(searchTerm) {
  // Handle null or undefined input
  if (searchTerm === null || searchTerm === undefined) {
    return null;
  }

  // Trim whitespace
  const trimmed = searchTerm.trim();

  // Check for empty or too short strings
  if (!trimmed || trimmed.length < 2) {
    return null;
  }

  return trimmed;
}
