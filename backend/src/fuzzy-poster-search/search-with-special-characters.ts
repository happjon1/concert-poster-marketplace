import { PrismaClient } from "@prisma/client";

/**
 * Performs a search for terms with special characters like "AC/DC" or "R.E.M."
 * This function handles exact and fuzzy matching for band names or terms with special characters.
 *
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term containing special characters (e.g., "AC/DC")
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchWithSpecialCharacters(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  // Handle terms with special characters like "AC/DC", "R.E.M.", etc.
  const results = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    LEFT JOIN "Artist" a ON p."artistId" = a.id
    WHERE 
      -- Check if the search term directly appears in the title, description or artist name
      p.title ILIKE ${`%${searchTerm}%`} OR
      p.description ILIKE ${`%${searchTerm}%`} OR
      a.name ILIKE ${`%${searchTerm}%`} OR
      
      -- Also check for versions without the special characters or with spaces instead
      p.title ILIKE ${`%${searchTerm.replace(/[\W_]+/g, " ")}%`} OR
      p.description ILIKE ${`%${searchTerm.replace(/[\W_]+/g, " ")}%`} OR
      a.name ILIKE ${`%${searchTerm.replace(/[\W_]+/g, " ")}%`} OR
      
      -- Also check for versions with special characters removed completely
      p.title ILIKE ${`%${searchTerm.replace(/[\W_]+/g, "")}%`} OR
      p.description ILIKE ${`%${searchTerm.replace(/[\W_]+/g, "")}%`} OR
      a.name ILIKE ${`%${searchTerm.replace(/[\W_]+/g, "")}%`}
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
