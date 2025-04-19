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
    WITH matching_posters AS (
      SELECT DISTINCT p.id
      FROM "Poster" p
      LEFT JOIN "PosterArtist" pa ON p.id = pa."posterId"
      LEFT JOIN "Artist" a ON pa."artistId" = a.id
      LEFT JOIN "PosterEvent" pe ON p.id = pe."posterId"
      LEFT JOIN "Event" e ON pe."eventId" = e.id
      LEFT JOIN "Venue" v ON e."venueId" = v.id
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
          OR p.description ILIKE ${`%${city}%`}
          OR similarity(v.city, ${city}) > ${similarityThreshold}
        )
    )
    SELECT id FROM matching_posters
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
