import { PrismaClient } from "@prisma/client";
import { searchWithSpecialCharacters } from "./search-with-special-characters.js";

/**
 * Handles search terms with special characters like "AC/DC"
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term containing special characters
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleSpecialCharacterSearch(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  if (/[\W_]+/.test(searchTerm) && !/\s/.test(searchTerm)) {
    const specialResults = await searchWithSpecialCharacters(
      prisma,
      searchTerm
    );
    return specialResults;
  }
  return [];
}
