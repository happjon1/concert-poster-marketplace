import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Helper function specifically for city searches, optimized for multi-word cities
 * like "New York" or "San Francisco"
 *
 * @param prisma - PrismaClient instance
 * @param cityName - The name of the city to search for
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.3)
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForCity(
  prisma: PrismaClient,
  cityName: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  // Execute a specialized search focused on city matching
  // Lower the threshold slightly for multi-word city names to improve matches
  const adjustedThreshold = cityName.includes(" ")
    ? Math.max(0.2, similarityThreshold - 0.1)
    : similarityThreshold;

  // Create a pattern for exact substring matching
  const exactPattern = `%${cityName.toLowerCase().replace(/\s+/g, "%")}%`;

  // For multi-word cities, use a more comprehensive approach combining exact pattern matching
  // and similarity-based searching
  const result = await prisma.$queryRaw<
    Array<{ id: number; similarity: number }>
  >(
    Prisma.sql`
      SELECT DISTINCT p.id, 
        GREATEST(
          similarity(LOWER(v.city), LOWER(${cityName})),
          -- Boost exact matches for multi-word cities
          CASE WHEN LOWER(v.city) LIKE LOWER(${exactPattern}) THEN 0.95 ELSE 0 END,
          -- For multi-word cities, try partial matches
          CASE WHEN ${cityName.includes(" ")} 
               AND (${cityName.toLowerCase().includes("san")} OR ${cityName
      .toLowerCase()
      .includes("new")}) 
               THEN similarity(LOWER(v.city), LOWER(${
                 cityName.split(" ")[1] || cityName
               })) 
               ELSE 0 
          END,
          -- For multi-word cities, also check similarity with state since users sometimes mix them
          similarity(LOWER(CONCAT(v.city, ' ', COALESCE(v.state, ''))), LOWER(${cityName}))
        ) AS similarity
      FROM "Poster" p
      JOIN "PosterEvent" pe ON p.id = pe."posterId"
      JOIN "Event" e ON pe."eventId" = e.id
      JOIN "Venue" v ON e."venueId" = v.id
      WHERE 
        similarity(LOWER(v.city), LOWER(${cityName})) >= ${adjustedThreshold}
        OR LOWER(v.city) LIKE LOWER(${exactPattern})
        OR ${cityName.includes(" ")} AND LOWER(v.city) LIKE LOWER(${
      "%" + cityName.split(" ")[1] + "%"
    })
        OR similarity(LOWER(CONCAT(v.city, ' ', COALESCE(v.state, ''))), LOWER(${cityName})) >= ${adjustedThreshold}
      ORDER BY similarity DESC
      LIMIT 50
    `
  );

  return result.map((row) => row.id);
}
