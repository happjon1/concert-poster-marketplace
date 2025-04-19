import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Function specifically for handling search terms with special characters
 * like "AC/DC", "P!nk", or "Panic! At The Disco"
 *
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term containing special characters
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchWithSpecialCharacters(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  // Replace special characters with wildcards in pattern matching
  // This helps with artists like "AC/DC" where the "/" is significant
  const searchPattern = `%${searchTerm.replace(/[\W_]+/g, "%")}%`;

  // Also create a version with spaces instead of special chars for similarity matching
  const spacedSearchTerm = searchTerm.replace(/[\W_]+/g, " ").trim();

  // Use a lower threshold for special character searches to catch more matches
  const result = await prisma.$queryRaw<
    Array<{ id: number; match_priority: number }>
  >`
    SELECT DISTINCT 
      p.id,
      CASE 
        WHEN LOWER(a.name) = LOWER(${searchTerm}) THEN 1
        WHEN LOWER(a.name) LIKE LOWER(${`%${searchTerm}%`}) THEN 2
        ELSE 3
      END AS match_priority
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "Artist" a ON pa."artistId" = a.id
    WHERE 
      -- Direct substring match (handles exact special character matches)
      LOWER(a.name) LIKE LOWER(${`%${searchTerm}%`})
      -- Pattern match with % replacing special chars (handles case differences)
      OR LOWER(a.name) LIKE LOWER(${searchPattern})
      -- Similarity match with spaced version (handles cases where DB has spaces instead of special chars)
      OR similarity(LOWER(a.name), LOWER(${spacedSearchTerm})) >= 0.3
      -- Also check poster title/description which might mention the artist with special chars
      OR LOWER(p.title) LIKE LOWER(${`%${searchTerm}%`})
      OR LOWER(p.description) LIKE LOWER(${`%${searchTerm}%`})
    ORDER BY match_priority
    LIMIT 50
  `;

  return result.map((row) => row.id);
}
