import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Helper function to search for a single artist by name
 *
 * @param prisma - PrismaClient instance
 * @param artistName - The name of the artist to search for
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.3)
 * @returns Array of poster IDs that match the search criteria
 */
export async function searchForSingleArtist(
  prisma: PrismaClient,
  artistName: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  // Execute a specific search just for this artist name
  const result = await prisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
      SELECT DISTINCT p.id
      FROM "Poster" p
      JOIN "PosterArtist" pa ON p.id = pa."posterId"
      JOIN "Artist" a ON pa."artistId" = a.id
      WHERE similarity(LOWER(a.name), LOWER(${artistName})) >= ${similarityThreshold}
      LIMIT 20
    `
  );

  return result.map((row) => row.id);
}
