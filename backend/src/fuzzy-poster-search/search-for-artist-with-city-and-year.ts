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
  try {
    // Use different thresholds for artists and cities
    // For severely misspelled names, we need very low thresholds
    const artistFuzzyThreshold = 0.15;
    const cityFuzzyThreshold = 0.1; // Ultra-low threshold for city names with transposed characters

    // This query does the following:
    // 1. Finds artists that match the artist name (exact or fuzzy)
    // 2. Finds venues in the specified city using multiple fuzzy matching techniques
    // 3. Finds events in the specified year at those venues
    // 4. Finds posters that have the matching artist AND at least one event in the desired city/year
    // 5. Excludes posters that have any events not matching the criteria
    const results = await prisma.$queryRaw<{ id: number }[]>`
      WITH 
      matching_artists AS (
        SELECT DISTINCT a.id AS artist_id
        FROM "Artist" a
        WHERE 
          -- Exact match (case insensitive)
          LOWER(a.name) ILIKE LOWER(${`%${artist}%`})
          -- Fuzzy match using similarity
          OR similarity(LOWER(a.name), LOWER(${artist})) > ${artistFuzzyThreshold}
      ),
      matching_cities AS (
        SELECT DISTINCT v.id AS venue_id
        FROM "Venue" v
        WHERE 
          -- Exact match (case insensitive)
          LOWER(v.city) ILIKE LOWER(${`%${city}%`})
          -- Fuzzy match using similarity - very low threshold for transposed letters
          OR similarity(LOWER(v.city), LOWER(${city})) > ${cityFuzzyThreshold}
          -- Additional pattern match for cities with spaces
          OR LOWER(v.city) % LOWER(${city})
      ),
      matching_events AS (
        SELECT DISTINCT e.id AS event_id
        FROM "Event" e
        JOIN "Venue" v ON e."venueId" = v.id
        WHERE 
          v.id IN (SELECT venue_id FROM matching_cities)
          AND EXTRACT(YEAR FROM e.date) = ${year}
      ),
      artist_posters AS (
        SELECT DISTINCT p.id
        FROM "Poster" p
        JOIN "PosterArtist" pa ON p.id = pa."posterId"
        JOIN matching_artists ma ON pa."artistId" = ma.artist_id
      ),
      event_posters AS (
        SELECT DISTINCT p.id
        FROM "Poster" p
        JOIN "PosterEvent" pe ON p.id = pe."posterId"
        WHERE pe."eventId" IN (SELECT event_id FROM matching_events)
      ),
      candidate_posters AS (
        SELECT ap.id
        FROM artist_posters ap
        JOIN event_posters ep ON ap.id = ep.id
      ),
      non_matching_events AS (
        SELECT DISTINCT pe."posterId"
        FROM "PosterEvent" pe
        JOIN "Event" e ON pe."eventId" = e.id
        LEFT JOIN matching_events me ON e.id = me.event_id
        WHERE me.event_id IS NULL
      )
      SELECT cp.id 
      FROM candidate_posters cp
      WHERE cp.id NOT IN (SELECT "posterId" FROM non_matching_events)
      LIMIT 100;
    `;

    return results.map((row) => row.id);
  } catch (error) {
    console.error("Error in searchForArtistWithCityAndYear:", error);
    return [];
  }
}
