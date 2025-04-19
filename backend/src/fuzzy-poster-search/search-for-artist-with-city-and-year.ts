import { PrismaClient } from "@prisma/client";

/**
 * Searches for posters matching a specific artist, city, and year
 * This function is used for targeted searches like "Phish New York 2023"
 *
 * @param prisma - PrismaClient instance
 * @param artist - The artist name to search for
 * @param city - The city name to search for
 * @param year - The year to search for
 * @param similarityThreshold - Minimum similarity threshold for artist and city matching
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForArtistWithCityAndYear(
  prisma: PrismaClient,
  artist: string,
  city: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  // First approach: Use a subquery to handle the DISTINCT issue
  const results = await prisma.$queryRaw<{ id: number }[]>`
    WITH matching_posters AS (
      SELECT p.id
      FROM "Poster" p
      LEFT JOIN "PosterArtist" pa ON p.id = pa."posterId"
      LEFT JOIN "Artist" a ON pa."artistId" = a.id
      LEFT JOIN "PosterEvent" pe ON p.id = pe."posterId"
      LEFT JOIN "Event" e ON pe."eventId" = e.id
      LEFT JOIN "Venue" v ON e."venueId" = v.id
      WHERE 
        -- Strict year matching using event date
        (EXTRACT(YEAR FROM e.date) = ${year})
        
        -- Artist name matching with similarity
        AND (
          a.name ILIKE ${`%${artist}%`}
          OR similarity(a.name, ${artist}) > ${similarityThreshold}
        )
        
        -- City matching with similarity
        AND (
          v.city ILIKE ${`%${city}%`}
          OR p.description ILIKE ${`%${city}%`}
          OR similarity(v.city, ${city}) > ${similarityThreshold}
        )
    )
    SELECT DISTINCT id
    FROM matching_posters
    LIMIT 100;
  `;

  return results.map((row) => row.id);
}
