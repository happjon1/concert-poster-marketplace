import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Function specifically for handling "artist name + year" queries
 * This ensures strict AND logic between the artist name and the year
 *
 * @param prisma - PrismaClient instance
 * @param artistName - The artist name to search for
 * @param year - The year to search for
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.3)
 * @returns Array of poster IDs that match both the artist and year criteria
 */
export async function searchForArtistWithYear(
  prisma: PrismaClient,
  artistName: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  console.log(
    `Performing strict artist+year search for "${artistName}" in ${year}`
  );

  // First find artists that match the artist name
  const artistMatches = await prisma.$queryRaw<
    { id: number; similarity: number }[]
  >`
    SELECT a.id, similarity(a.name, ${artistName}) as similarity
    FROM "Artist" a
    WHERE similarity(a.name, ${artistName}) > ${similarityThreshold}
    ORDER BY similarity DESC
  `;

  if (artistMatches.length === 0) {
    console.log("No matching artists found");
    return [];
  }

  console.log(`Found ${artistMatches.length} potential artist matches`);

  // Get all artist IDs with their similarity scores
  const artistIds = artistMatches.map((match) => match.id);

  // Find posters with these artists AND from the specific year
  const posterResults = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "PosterEvent" pe ON p.id = pe."posterId"
    JOIN "Event" e ON pe."eventId" = e.id
    WHERE 
      pa."artistId" IN (${Prisma.join(artistIds)})
      AND EXTRACT(YEAR FROM e.date) = ${year}
  `;

  console.log(
    `Found ${posterResults.length} posters matching both artist and year ${year}`
  );

  return posterResults.map((result) => result.id);
}
