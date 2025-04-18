import { PrismaClient } from "@prisma/client";
import prisma from "./config/prisma"; // Import shared Prisma instance

// Create a debug file to check for Phish posters in Seattle
async function debugSearch() {
  try {
    // Search for artists with "phish" in the name
    const phishArtists = await prisma.artist.findMany({
      where: {
        name: {
          contains: "phish",
          mode: "insensitive",
        },
      },
    });

    console.log("Phish artists:", phishArtists);

    // Search for venues in Seattle
    const seattleVenues = await prisma.venue.findMany({
      where: {
        OR: [
          { name: { contains: "seattle", mode: "insensitive" } },
          { city: { contains: "seattle", mode: "insensitive" } },
        ],
      },
    });

    console.log("Seattle venues:", seattleVenues);

    // Check for posters that match both conditions
    const matchingPosters = await prisma.poster.findMany({
      where: {
        AND: [
          {
            artists: {
              some: {
                artist: {
                  name: {
                    contains: "phish",
                    mode: "insensitive",
                  },
                },
              },
            },
          },
          {
            events: {
              some: {
                event: {
                  venue: {
                    OR: [
                      { name: { contains: "seattle", mode: "insensitive" } },
                      { city: { contains: "seattle", mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
        events: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
    });

    console.log("Matching posters:", matchingPosters.length);
    if (matchingPosters.length > 0) {
      matchingPosters.forEach((poster) => {
        console.log("\nPoster ID:", poster.id);
        console.log("Title:", poster.title);
        console.log(
          "Artists:",
          poster.artists.map((pa) => pa.artist.name)
        );
        console.log(
          "Venues:",
          poster.events.map(
            (pe) => `${pe.event.venue.name} (${pe.event.venue.city})`
          )
        );
      });
    }

    // Do we have any Phish posters at all?
    const anyPhishPosters = await prisma.poster.findMany({
      where: {
        artists: {
          some: {
            artist: {
              name: {
                contains: "phish",
                mode: "insensitive",
              },
            },
          },
        },
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
        events: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
      take: 5,
    });

    console.log("\nAny Phish posters:", anyPhishPosters.length);
    if (anyPhishPosters.length > 0) {
      anyPhishPosters.forEach((poster) => {
        console.log("\nPoster ID:", poster.id);
        console.log("Title:", poster.title);
        console.log(
          "Artists:",
          poster.artists.map((pa) => pa.artist.name)
        );
        console.log(
          "Venues:",
          poster.events.map(
            (pe) => `${pe.event.venue.name} (${pe.event.venue.city})`
          )
        );
      });
    }

    // Do we have any Seattle posters at all?
    const anySeattlePosters = await prisma.poster.findMany({
      where: {
        events: {
          some: {
            event: {
              venue: {
                OR: [
                  { name: { contains: "seattle", mode: "insensitive" } },
                  { city: { contains: "seattle", mode: "insensitive" } },
                ],
              },
            },
          },
        },
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
        events: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
      take: 5,
    });

    console.log("\nAny Seattle posters:", anySeattlePosters.length);
    if (anySeattlePosters.length > 0) {
      anySeattlePosters.forEach((poster) => {
        console.log("\nPoster ID:", poster.id);
        console.log("Title:", poster.title);
        console.log(
          "Artists:",
          poster.artists.map((pa) => pa.artist.name)
        );
        console.log(
          "Venues:",
          poster.events.map(
            (pe) => `${pe.event.venue.name} (${pe.event.venue.city})`
          )
        );
      });
    }
  } catch (error) {
    console.error("Error in debug search:", error);
  }
}

debugSearch();
