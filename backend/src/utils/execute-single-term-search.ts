import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Executes a basic single-term search
 * @param prisma - PrismaClient instance
 * @param termToUse - The term to search for
 * @param similarityThreshold - Minimum similarity threshold
 * @param artistSimilarityThreshold - Minimum similarity threshold for artist matches
 * @returns Array of matching poster IDs
 */
export async function executeSingleTermSearch(
  prisma: PrismaClient,
  termToUse: string,
  similarityThreshold: number,
  artistSimilarityThreshold: number = 0.3
): Promise<number[]> {
  const result = await prisma.$queryRaw<
    Array<{ id: number; overall_similarity: number }>
  >(Prisma.sql`
    WITH 
      poster_search AS (
        SELECT 
          p.id,
          p.title,
          p.description,
          GREATEST(
            similarity(LOWER(p.title), LOWER(${termToUse})),
            similarity(LOWER(p.description), LOWER(${termToUse}))
          ) AS max_poster_similarity
        FROM "Poster" p
      ),
      artist_search AS (
        SELECT 
          pa.id as poster_artist_id,
          pa."posterId",
          a.name as artist_name,
          similarity(LOWER(a.name), LOWER(${termToUse})) AS artist_similarity
        FROM "PosterArtist" pa
        JOIN "Artist" a ON pa."artistId" = a.id
      ),
      event_search AS (
        SELECT 
          pe.id as poster_event_id,
          pe."posterId",
          e.name as event_name,
          v.name as venue_name,
          v.city as venue_city,
          v.state as venue_state,
          v.country as venue_country,
          GREATEST(
            similarity(LOWER(e.name), LOWER(${termToUse})),
            similarity(LOWER(v.name), LOWER(${termToUse})),
            similarity(LOWER(v.city), LOWER(${termToUse})),
            similarity(LOWER(COALESCE(v.state, '')), LOWER(${termToUse})),
            similarity(LOWER(v.country), LOWER(${termToUse}))
          ) AS event_similarity
        FROM "PosterEvent" pe
        JOIN "Event" e ON pe."eventId" = e.id
        JOIN "Venue" v ON e."venueId" = v.id
      )
    SELECT DISTINCT 
      ps.id,
      GREATEST(
        ps.max_poster_similarity, 
        COALESCE("as".artist_similarity, 0), 
        COALESCE(es.event_similarity, 0)
      ) AS overall_similarity
    FROM poster_search ps
    LEFT JOIN artist_search "as" ON ps.id = "as"."posterId"
    LEFT JOIN event_search es ON ps.id = es."posterId"
    WHERE 
      ps.max_poster_similarity >= ${similarityThreshold}
      OR "as".artist_similarity >= ${artistSimilarityThreshold}
      OR es.event_similarity >= ${similarityThreshold}
    ORDER BY overall_similarity DESC
    LIMIT 20
  `);

  return result.map((row) => row.id);
}
