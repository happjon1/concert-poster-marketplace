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
    WITH matching_posters AS (
      SELECT DISTINCT p.id
      FROM "Poster" p
      LEFT JOIN "PosterArtist" pa ON p.id = pa."posterId"
      LEFT JOIN "Artist" a ON pa."artistId" = a.id
      LEFT JOIN "PosterEvent" pe ON p.id = pe."posterId"
      LEFT JOIN "Event" e ON pe."eventId" = e.id
      WHERE 
        -- Strict year matching using the new startYear field
        (e."startYear" = ${year})
        
        -- Artist name matching with similarity
        AND (
          a.name ILIKE ${`%${artist}%`}
          OR similarity(a.name, ${artist}) > ${similarityThreshold}
          OR p.title ILIKE ${`%${artist}%`}
          OR similarity(p.title, ${artist}) > ${similarityThreshold}
        )
    )
    SELECT id FROM matching_posters
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
