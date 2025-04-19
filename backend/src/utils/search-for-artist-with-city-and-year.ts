import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Function specifically for handling "artist name + city + year" queries
 * This ensures strict AND logic between all three components
 *
 * @param prisma - PrismaClient instance
 * @param artistName - The artist name to search for
 * @param cityName - The city name to search for
 * @param year - The year to search for
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.3)
 * @returns Array of poster IDs that match all three criteria
 */
export async function searchForArtistWithCityAndYear(
  prisma: PrismaClient,
  artistName: string,
  cityName: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  console.log(
    `Performing strict artist+city+year search for "${artistName}" in "${cityName}" in ${year}`
  );

  // First find artists that match the artist name
  const artistMatches = await prisma.$queryRaw<
    { id: number; similarity: number }[]
  >`
    SELECT a.id, similarity(LOWER(a.name), LOWER(${artistName})) as similarity
    FROM "Artist" a
    WHERE similarity(LOWER(a.name), LOWER(${artistName})) > ${similarityThreshold}
    ORDER BY similarity DESC
  `;

  if (artistMatches.length === 0) {
    console.log("No matching artists found");
    return [];
  }

  console.log(`Found ${artistMatches.length} potential artist matches`);

  // Get all artist IDs with their similarity scores
  const artistIds = artistMatches.map((match) => match.id);

  // Find posters with these artists AND in the specific city AND from the specific year
  const posterResults = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "PosterEvent" pe ON p.id = pe."posterId"
    JOIN "Event" e ON pe."eventId" = e.id
    JOIN "Venue" v ON e."venueId" = v.id
    WHERE 
      pa."artistId" IN (${Prisma.join(artistIds)})
      AND similarity(LOWER(v.city), LOWER(${cityName})) >= ${similarityThreshold}
      AND EXTRACT(YEAR FROM e.date) = ${year}
  `;

  console.log(
    `Found ${posterResults.length} posters matching artist "${artistName}", city "${cityName}", and year ${year}`
  );

  return posterResults.map((result) => result.id);
}
