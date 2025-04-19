import { PrismaClient } from "@prisma/client";

/**
 * Searches for posters matching a specific artist and year
 * This function is used for targeted searches like "Phish 2023"
 *
 * @param prisma - PrismaClient instance
 * @param artist - The artist name to search for
 * @param year - The year to search for
 * @param similarityThreshold - Minimum similarity threshold for artist matching
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForArtistWithYear(
  prisma: PrismaClient,
  artist: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  const results = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    LEFT JOIN "Artist" a ON p."artistId" = a.id
    WHERE 
      -- Strict year matching
      (p.year = ${year} OR p.date::text LIKE ${`${year}%`})
      
      -- Artist name matching with similarity
      AND (
        a.name ILIKE ${`%${artist}%`}
        OR similarity(a.name, ${artist}) > ${similarityThreshold}
        OR p.title ILIKE ${`%${artist}%`}
        OR similarity(p.title, ${artist}) > ${similarityThreshold}
      )
    ORDER BY 
      -- Order by exact matches first, then by similarity
      CASE WHEN a.name ILIKE ${`%${artist}%`} THEN 1
           WHEN similarity(a.name, ${artist}) > 0.6 THEN 2
           ELSE 3
      END,
      p.year DESC,
      p.date DESC
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
