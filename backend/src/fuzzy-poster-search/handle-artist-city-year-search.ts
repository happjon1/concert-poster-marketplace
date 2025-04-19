import { PrismaClient } from "@prisma/client";
import { searchForArtistWithCityAndYear } from "./search-for-artist-with-city-and-year.js";
import { generateArtistCityCombinations } from "./generate-artist-city-combinations.js";

/**
 * Handles the artist+city+year search pattern
 * @param prisma - PrismaClient instance
 * @param yearValue - Extracted year value
 * @param searchWithoutYear - Search term with year removed
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleArtistCityYearSearch(
  prisma: PrismaClient,
  yearValue: number | null,
  searchWithoutYear: string
): Promise<number[]> {
  // Only proceed if we have a year and at least 2 more terms
  if (
    !yearValue ||
    !searchWithoutYear ||
    searchWithoutYear.split(/\s+/).length < 2
  ) {
    return [];
  }

  console.log(
    `Detected potential artist+city+year pattern with year ${yearValue}`
  );

  const possibleCombinations =
    generateArtistCityCombinations(searchWithoutYear);

  // Try each combination and return the first one that finds results
  for (const combo of possibleCombinations) {
    if (combo.artist.length >= 2 && combo.city.length >= 2) {
      console.log(
        `Trying artist+city+year combination: "${combo.artist}" in "${combo.city}" in ${yearValue}`
      );

      // Call our specialized function for strict artist+city+year search
      const strictResults = await searchForArtistWithCityAndYear(
        prisma,
        combo.artist,
        combo.city,
        yearValue,
        0.3 // Slightly lower threshold for better matches
      );

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results matching artist "${combo.artist}", city "${combo.city}", and year ${yearValue}`
        );
        return strictResults;
      }
    }
  }

  return [];
}
