// Debug script to check for posters with Stone Temple Pilots as an artist
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  console.log("Debugging search for Stone Temple Pilots");

  try {
    // 1. First check if the artist exists
    console.log("Checking if Stone Temple Pilots exists in artists table...");
    const stpArtist = await prisma.artist.findFirst({
      where: {
        name: {
          contains: "Stone Temple Pilots",
          mode: "insensitive",
        },
      },
    });

    console.log("Artist search result:", stpArtist);

    // 2. Look for any posters with this artist
    console.log("\nLooking for posters with Stone Temple Pilots...");
    const posters = await prisma.poster.findMany({
      where: {
        artists: {
          some: {
            artist: {
              name: {
                contains: "Stone Temple Pilots",
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
      },
    });

    console.log(`Found ${posters.length} posters with Stone Temple Pilots`);

    if (posters.length > 0) {
      posters.forEach((poster, index) => {
        console.log(`\nPoster ${index + 1}:`);
        console.log(`  ID: ${poster.id}`);
        console.log(`  Title: ${poster.title}`);
        console.log(
          `  Artists: ${poster.artists.map((pa) => pa.artist.name).join(", ")}`
        );
      });
    }

    // 3. Test our search function directly with the term "stone"
    console.log("\nTesting search with term 'stone'...");
    const searchPosters = await prisma.poster.findMany({
      where: {
        OR: [
          // Test direct title/description search
          {
            title: {
              contains: "stone",
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: "stone",
              mode: "insensitive",
            },
          },
          // Test artist name search
          {
            artists: {
              some: {
                artist: {
                  name: {
                    contains: "stone",
                    mode: "insensitive",
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
      },
    });

    console.log(
      `\nFound ${searchPosters.length} posters with 'stone' in title, description, or artist name`
    );

    if (searchPosters.length > 0) {
      searchPosters.forEach((poster, index) => {
        console.log(`\nPoster ${index + 1}:`);
        console.log(`  ID: ${poster.id}`);
        console.log(`  Title: ${poster.title}`);
        console.log(
          `  Artists: ${poster.artists.map((pa) => pa.artist.name).join(", ")}`
        );
      });
    }
  } catch (error) {
    console.error("Error during debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
