import { PrismaClient } from "@prisma/client";

/**
 * Searches for posters matching a single artist name
 * This function is used for individual artist searches in multi-artist queries like "Artist1 OR Artist2"
 *
 * @param prisma - PrismaClient instance
 * @param artist - The artist name to search for
 * @param similarityThreshold - Minimum similarity threshold for matching
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForSingleArtist(
  prisma: PrismaClient,
  artist: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  const results = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    LEFT JOIN "Artist" a ON p."artistId" = a.id
    WHERE 
      -- Artist name matching with similarity
      a.name ILIKE ${`%${artist}%`}
      OR similarity(a.name, ${artist}) > ${similarityThreshold}
      OR p.title ILIKE ${`%${artist}%`}
      OR similarity(p.title, ${artist}) > ${similarityThreshold}
      OR p.description ILIKE ${`%${artist}%`}
    ORDER BY 
      -- Order by exact matches first, then by similarity
      CASE WHEN a.name ILIKE ${`%${artist}%`} THEN 1
           WHEN p.title ILIKE ${`%${artist}%`} THEN 2
           WHEN similarity(a.name, ${artist}) > 0.7 THEN 3
           ELSE 4
      END,
      p.year DESC,
      p.date DESC
    LIMIT 50;
  `;

  return results.map((row) => row.id);
}
