import { PrismaClient } from "@prisma/client";

/**
 * Searches for posters matching a specific artist and city
 * This function is used for targeted searches like "Phish Seattle"
 *
 * @param prisma - PrismaClient instance
 * @param artist - The artist name to search for
 * @param city - The city name to search for
 * @param similarityThreshold - Minimum similarity threshold for matching
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForArtistWithCity(
  prisma: PrismaClient,
  artist: string,
  city: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  const results = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    LEFT JOIN "Artist" a ON p."artistId" = a.id
    LEFT JOIN "Venue" v ON p."venueId" = v.id
    WHERE 
      -- Artist name matching with similarity
      (
        a.name ILIKE ${`%${artist}%`}
        OR similarity(a.name, ${artist}) > ${similarityThreshold}
        OR p.title ILIKE ${`%${artist}%`}
        OR similarity(p.title, ${artist}) > ${similarityThreshold}
      )
      
      -- City matching with similarity
      AND (
        v.city ILIKE ${`%${city}%`}
        OR p.venue ILIKE ${`%${city}%`}
        OR p.location ILIKE ${`%${city}%`}
        OR p.description ILIKE ${`%${city}%`}
        OR similarity(v.city, ${city}) > ${similarityThreshold}
        OR similarity(p.venue, ${city}) > ${similarityThreshold}
        OR similarity(p.location, ${city}) > ${similarityThreshold}
      )
    ORDER BY 
      -- Order by exact matches first, then by similarity
      CASE WHEN a.name ILIKE ${`%${artist}%`} AND v.city ILIKE ${`%${city}%`} THEN 1
           WHEN a.name ILIKE ${`%${artist}%`} THEN 2
           WHEN v.city ILIKE ${`%${city}%`} THEN 3
           ELSE 4
      END,
      p.year DESC,
      p.date DESC
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
