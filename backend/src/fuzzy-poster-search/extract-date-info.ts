import { MONTH_NAMES } from "./fuzzy-search-constants.js";
import * as chrono from "chrono-node";

/**
 * Result type for date extraction
 */
export interface DateExtractionResult {
  hasDate: boolean;
  year: number | null;
  month: number | null;
  day: number | null;
  searchWithoutDate: string;
  // Additional fields for more detailed date information
  dateText?: string; // The original text that was identified as a date
  startDate?: Date | null; // Parsed start date if available
  endDate?: Date | null; // Parsed end date if range is detected
  isDateRange?: boolean; // Whether the detected date is a range
}

/**
 * Extract date information from search term using both pattern matching and natural language processing
 *
 * @param searchTerm - The search term to extract date information from
 * @returns Object with date information and search term without date
 */
export function extractDateInfo(searchTerm: string): DateExtractionResult {
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let searchWithoutDate = searchTerm;
  let hasDate = false;
  let dateText: string | undefined;
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let isDateRange = false;

  // Check for MM/DD/YYYY format first (like 6/30/2024)
  const mmDdYyyyPattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/;
  const mmDdYyyyMatch = searchTerm.match(mmDdYyyyPattern);

  if (mmDdYyyyMatch) {
    const monthValue = parseInt(mmDdYyyyMatch[1], 10);
    const dayValue = parseInt(mmDdYyyyMatch[2], 10);
    let yearValue = parseInt(mmDdYyyyMatch[3], 10);

    // Handle 2-digit years
    if (yearValue < 100) {
      yearValue = yearValue < 50 ? 2000 + yearValue : 1900 + yearValue;
    }

    // Validate month, day, and year values
    if (
      monthValue >= 1 &&
      monthValue <= 12 &&
      dayValue >= 1 &&
      dayValue <= 31
    ) {
      month = monthValue - 1; // Convert to 0-indexed month
      day = dayValue;
      year = yearValue;
      hasDate = true;
      dateText = mmDdYyyyMatch[0];

      // Build full date
      startDate = new Date(year, month, day);

      // Remove the date pattern from search term
      searchWithoutDate = searchTerm.replace(mmDdYyyyPattern, "").trim();
      searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");

      // Log the extraction for debugging
      console.log(
        `Extracted full date: ${
          month + 1
        }/${day}/${year} from "${searchTerm}", remaining term: "${searchWithoutDate}"`
      );
    }
  }
  // If not a MM/DD/YYYY format, then check for MM/DD format
  else {
    const mmDdPattern = /\b(\d{1,2})\/(\d{1,2})\b/;
    const mmDdMatch = searchTerm.match(mmDdPattern);

    if (mmDdMatch) {
      const monthValue = parseInt(mmDdMatch[1], 10);
      const dayValue = parseInt(mmDdMatch[2], 10);

      // Validate month and day values
      if (
        monthValue >= 1 &&
        monthValue <= 12 &&
        dayValue >= 1 &&
        dayValue <= 31
      ) {
        month = monthValue - 1; // Convert to 0-indexed month
        day = dayValue;
        hasDate = true;
        dateText = mmDdMatch[0];

        // Build current year date (will be replaced if year is found later)
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, month, day);

        // Remove the date pattern from search term
        searchWithoutDate = searchTerm.replace(mmDdPattern, "").trim();
        searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");

        // Log the extraction for debugging
        console.log(
          `Extracted month/day format: ${
            month + 1
          }/${day} from "${searchTerm}", remaining term: "${searchWithoutDate}"`
        );
      }
    }
  }

  // If we didn't find a MM/DD pattern or MM/DD/YYYY pattern, try chrono and other methods
  if (!hasDate) {
    // STEP 1: Use chrono-node for natural language date parsing
    try {
      // Special handling for date range phrases
      const containsRangeWords =
        /\b(between|from|during)\b.+\b(and|to|until|through)\b/i.test(
          searchTerm
        );

      const parsedDates = chrono.parse(searchTerm);

      if (parsedDates && parsedDates.length > 0) {
        const parsedDate = parsedDates[0];
        dateText = parsedDate.text;
        hasDate = true;

        // Get start date information
        if (parsedDate.start) {
          startDate = parsedDate.start.date();

          // Extract year, month, day if available and certain
          if (parsedDate.start.isCertain("year")) {
            year = startDate.getFullYear();
          }

          if (parsedDate.start.isCertain("month")) {
            month = startDate.getMonth(); // 0-based month index
          }

          if (parsedDate.start.isCertain("day")) {
            day = startDate.getDate();
          }
        }

        // Check if it's a date range
        if (parsedDate.end) {
          endDate = parsedDate.end.date();
          isDateRange = true;
        } else if (containsRangeWords) {
          // If contains range words but no explicit end date, set the end date
          // to the end of the same month or year depending on available information
          isDateRange = true;

          if (startDate) {
            if (month !== null && year !== null) {
              // End of month
              endDate = new Date(year, month + 1, 0, 23, 59, 59);
            } else if (year !== null) {
              // End of year
              endDate = new Date(year, 11, 31, 23, 59, 59);
            }
          }
        }

        // Special case for "between June and August 2025" and similar
        if (
          searchTerm.match(/\b(between|from)\s+\w+\s+(and|to)\s+\w+\s+\d{4}\b/i)
        ) {
          isDateRange = true;
        }

        // Remove the identified date text from the search term and normalize whitespace
        searchWithoutDate = searchTerm.replace(dateText, "").trim();

        // Special handling for date range prepositions that might not be part of the dateText
        // but should still be removed from the search term
        if (isDateRange) {
          // Remove common range prepositions if they're still present
          searchWithoutDate = searchWithoutDate
            .replace(/\b(from|between|during)\b/gi, "")
            .replace(/\b(and|to|until|through)\b/gi, "")
            .trim();
        }

        searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");

        // Special handling for complex date descriptions
        // Check if the text contains month names that may not have been fully extracted
        const remainingMonthMatch = MONTH_NAMES.some((monthName) =>
          searchWithoutDate.toLowerCase().includes(monthName.toLowerCase())
        );

        if (remainingMonthMatch) {
          // Try to extract remaining month references with the regex approach
          const monthPattern = new RegExp(
            `\\b(${MONTH_NAMES.join("|")})\\b`,
            "i"
          );
          const monthMatch = searchWithoutDate.match(monthPattern);

          if (monthMatch) {
            const monthName = monthMatch[0].toLowerCase();
            const monthIndex = MONTH_NAMES.indexOf(monthName);

            if (monthIndex !== -1) {
              month = monthIndex;

              // Update the search term to remove this month reference
              searchWithoutDate = searchWithoutDate
                .replace(monthPattern, "")
                .trim();
              searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");
            }
          }
        }
      }
    } catch (error) {
      // Error in chrono parsing - fall back to regex approach
      console.error("Error in chrono date parsing:", error);
    }

    // STEP 2: Fall back to regex pattern matching if no date found with chrono
    if (!hasDate) {
      // Look for year pattern like "2023" or "1995" at word boundaries
      const yearPattern = /\b(19|20)\d{2}\b/g;
      const yearMatches = searchTerm.match(yearPattern);

      if (yearMatches && yearMatches.length > 0) {
        year = parseInt(yearMatches[0], 10);
        hasDate = true;
        dateText = yearMatches[0];

        // Remove the year from the search term and normalize whitespace
        searchWithoutDate = searchTerm.replace(yearPattern, "").trim();
        searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");

        // Create a basic date object for the year
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        isDateRange = true;
      }

      // Look for month names if year was not found or even if it was
      const monthPattern = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\b`, "i");
      const monthMatch = searchWithoutDate.match(monthPattern);

      if (monthMatch) {
        const monthName = monthMatch[0].toLowerCase();
        const monthIndex = MONTH_NAMES.indexOf(monthName);

        if (monthIndex !== -1) {
          month = monthIndex;
          hasDate = true;

          // If we already found a year, enhance the date object
          if (year !== null) {
            startDate = new Date(year, month, 1);
            // Last day of month
            endDate = new Date(year, month + 1, 0, 23, 59, 59);
            isDateRange = true;
          } else {
            // Just month, use current year
            const currentYear = new Date().getFullYear();
            startDate = new Date(currentYear, month, 1);
            endDate = new Date(currentYear, month + 1, 0, 23, 59, 59);
            isDateRange = true;
          }

          // Remove the month from the search term and normalize whitespace
          searchWithoutDate = searchWithoutDate
            .replace(monthPattern, "")
            .trim();
          searchWithoutDate = searchWithoutDate.replace(/\s+/g, " ");
        }
      }
    }
  }

  // Handle special case for "weekend of" constructs that chrono might not get right
  if (hasDate && searchTerm.includes("weekend") && month !== null) {
    // Keep the month value even if chrono didn't expose it through isCertain
    if (startDate) {
      month = startDate.getMonth();
    }
  }

  return {
    hasDate,
    year,
    month,
    day,
    searchWithoutDate,
    dateText,
    startDate,
    endDate,
    isDateRange,
  };
}
