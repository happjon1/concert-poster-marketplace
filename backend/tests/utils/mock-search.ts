import { PrismaClient } from "@prisma/client";

// Registry to track test data for search
export const testDataRegistry = {
  posters: new Map<
    number,
    {
      title: string;
      id: number;
      artists: string[];
      venues: string[];
      cities: string[];
    }
  >(),
  artists: new Map<string, string>(),
  venues: new Map<string, { name: string; city: string }>(),
};

/**
 * Register test poster data so the mock search knows what's available
 */
export function registerTestData(data: {
  posters?: Array<{
    id: number;
    title: string;
    artists?: string[];
    venues?: string[];
    cities?: string[];
  }>;
  artists?: Array<{ id: string; name: string }>;
  venues?: Array<{ id: string; name: string; city: string }>;
}) {
  // Clear previous data
  testDataRegistry.posters.clear();
  testDataRegistry.artists.clear();
  testDataRegistry.venues.clear();

  // Register new data
  if (data.posters) {
    data.posters.forEach((p) =>
      testDataRegistry.posters.set(p.id, {
        id: p.id,
        title: p.title,
        artists: p.artists || [],
        venues: p.venues || [],
        cities: p.cities || [],
      })
    );
  }

  if (data.artists) {
    data.artists.forEach((a) => testDataRegistry.artists.set(a.id, a.name));
  }

  if (data.venues) {
    data.venues.forEach((v) =>
      testDataRegistry.venues.set(v.id, { name: v.name, city: v.city })
    );
  }

  console.log(
    `Test data registered: ${testDataRegistry.posters.size} posters, ${testDataRegistry.artists.size} artists, ${testDataRegistry.venues.size} venues`
  );
}

/**
 * Implementation of fuzzy search for tests when pg_trgm extension is not available
 */
export async function basicPosterSearch(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  console.log(`Basic search called with term: "${searchTerm}"`);

  // Simple string matching - will be used when pg_trgm is not available
  const searchTermLower = searchTerm.toLowerCase();
  const terms = searchTermLower.split(/\s+/);

  // Basic search using Prisma queries instead of raw SQL with pg_trgm
  // This should approximate the behavior of the fuzzy search
  try {
    // Create a basic artist-term search
    let posters = await prisma.poster.findMany({
      where: {
        OR: [
          // Match by title
          { title: { contains: searchTermLower, mode: "insensitive" } },
          // Match by description
          { description: { contains: searchTermLower, mode: "insensitive" } },
          // Match by artist name
          {
            artists: {
              some: {
                artist: {
                  name: { contains: searchTermLower, mode: "insensitive" },
                },
              },
            },
          },
          // Match by venue city
          {
            events: {
              some: {
                event: {
                  venue: {
                    city: { contains: searchTermLower, mode: "insensitive" },
                  },
                },
              },
            },
          },
          // Match by venue name
          {
            events: {
              some: {
                event: {
                  venue: {
                    name: { contains: searchTermLower, mode: "insensitive" },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    // Special handling for multi-term searches (artist + city/venue/year)
    if (terms.length > 1) {
      // Handle special cases like "Phish Seattle" or "Phish 2023"
      const firstTerm = terms[0];
      const secondTerm = terms[1];

      // Check if second term is a year
      const yearMatch = /^(19|20)\d{2}$/.test(secondTerm);

      if (yearMatch) {
        // This is likely "Artist Year" pattern
        const year = parseInt(secondTerm);

        // Find posters by artist AND year
        const artistYearPosters = await prisma.poster.findMany({
          where: {
            AND: [
              // Artist match
              {
                artists: {
                  some: {
                    artist: {
                      name: { contains: firstTerm, mode: "insensitive" },
                    },
                  },
                },
              },
              // Year match
              {
                events: {
                  some: {
                    event: {
                      date: {
                        gte: new Date(`${year}-01-01`),
                        lt: new Date(`${year + 1}-01-01`),
                      },
                    },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });

        // If we have specific matches, use those instead
        if (artistYearPosters.length > 0) {
          posters = artistYearPosters;
        }
      } else {
        // This might be "Artist City" pattern
        // Find posters by artist AND city
        const artistCityPosters = await prisma.poster.findMany({
          where: {
            AND: [
              // Artist match
              {
                artists: {
                  some: {
                    artist: {
                      name: { contains: firstTerm, mode: "insensitive" },
                    },
                  },
                },
              },
              // City match
              {
                events: {
                  some: {
                    event: {
                      venue: {
                        city: { contains: secondTerm, mode: "insensitive" },
                      },
                    },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });

        // If we have specific matches, use those instead
        if (artistCityPosters.length > 0) {
          posters = artistCityPosters;
        }
      }
    }

    return posters.map((p) => p.id);
  } catch (error) {
    console.error("Error in basic search:", error);
    return [];
  }
}
