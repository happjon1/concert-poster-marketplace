// ESM-compatible debug script for search issue
import { PrismaClient } from "@prisma/client";
import { extractDateInfo } from "./fuzzy-poster-search/extract-date-info.js";
import { fuzzyPosterSearch } from "./fuzzy-poster-search/fuzzy-search.js";
import { handleDatePatterns } from "./fuzzy-poster-search/handle-date-patterns.js";
import dayjs from "dayjs";

// Create a Prisma client instance
const prisma = new PrismaClient({
  log: ["query"], // Log all queries to console
});

// Function to check a specific search term
async function testSearch(searchTerm) {
  console.log("\n===================================================");
  console.log(`TESTING SEARCH: "${searchTerm}"`);
  console.log("===================================================\n");

  // Test date extraction
  console.log("STEP 1: Testing date extraction");
  const dateInfo = extractDateInfo(searchTerm);
  console.log("Date extraction results:", JSON.stringify(dateInfo, null, 2));

  // Test date pattern handling specifically
  console.log("\nSTEP 2: Testing date pattern handling");
  const datePatternResults = await handleDatePatterns(prisma, searchTerm);
  console.log(`Date pattern results count: ${datePatternResults.length}`);

  if (datePatternResults.length > 0) {
    console.log("Poster IDs found:", datePatternResults);
    await showPosterDetails(datePatternResults);
  }

  // Test full fuzzy search
  console.log("\nSTEP 3: Testing full fuzzy search");
  const fuzzyResults = await fuzzyPosterSearch(prisma, searchTerm);
  console.log(`Full fuzzy search results count: ${fuzzyResults.length}`);

  if (fuzzyResults.length > 0) {
    console.log("Poster IDs found:", fuzzyResults);
    await showPosterDetails(fuzzyResults);
  }
}

// Function to show poster details for debugging
async function showPosterDetails(posterIds) {
  if (posterIds.length === 0) return;

  console.log("\nPOSTER DETAILS:");

  for (const posterId of posterIds) {
    const poster = await prisma.poster.findUnique({
      where: { id: posterId },
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

    if (poster) {
      console.log(`\nPoster ID: ${poster.id}`);
      console.log(`Title: ${poster.title}`);
      console.log(
        "Artists:",
        poster.artists.map((a) => a.artist.name).join(", ")
      );
      console.log("Events:");
      poster.events.forEach((e) => {
        const event = e.event;
        console.log(
          `  - ${event.name} (${dayjs(event.date).format("YYYY-MM-DD")}) at ${
            event.venue.name
          }, ${event.venue.city}`
        );
      });
    }
  }
}

// Function to check database for a specific event
async function checkDatabaseForEvent() {
  console.log("\n===================================================");
  console.log("CHECKING DATABASE FOR PHISH 6/30/2024 EVENT");
  console.log("===================================================\n");

  // Find Phish in artists
  const phishArtist = await prisma.artist.findFirst({
    where: {
      name: { equals: "Phish", mode: "insensitive" },
    },
  });

  console.log("Phish artist record:", phishArtist);

  if (phishArtist) {
    // Find events for Phish on 6/30
    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: dayjs("2024-06-30").startOf("day").toDate(),
          lt: dayjs("2024-07-01").startOf("day").toDate(),
        },
        artists: {
          some: {
            artist: {
              id: phishArtist.id,
            },
          },
        },
      },
      include: {
        venue: true,
        artists: {
          include: {
            artist: true,
          },
        },
      },
    });

    console.log(`Found ${events.length} events for Phish on 6/30/2024:`);
    events.forEach((event) => {
      console.log(
        `- ${event.name} (${dayjs(event.date).format()}) at ${event.venue.name}`
      );
    });

    // Find posters with these events
    if (events.length > 0) {
      const eventIds = events.map((e) => e.id);
      const posters = await prisma.poster.findMany({
        where: {
          events: {
            some: {
              eventId: {
                in: eventIds,
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
      });

      console.log(`\nFound ${posters.length} posters for these events:`);
      posters.forEach((poster) => {
        console.log(`- ID ${poster.id}: ${poster.title}`);
        console.log(
          `  Artists: ${poster.artists.map((a) => a.artist.name).join(", ")}`
        );
        console.log(
          `  Events: ${poster.events
            .map(
              (e) =>
                `${e.event.name} (${dayjs(e.event.date).format("YYYY-MM-DD")})`
            )
            .join(", ")}`
        );
      });
    }
  }
}

// Run the test searches
async function runTests() {
  // First check what's in the database
  await checkDatabaseForEvent();

  // Test different search patterns
  await testSearch("phish");
  await testSearch("phish 6/30");
  await testSearch("phish 6/30/2024");

  // Disconnect from the database
  await prisma.$disconnect();
}

// Run the tests
runTests().catch((error) => {
  console.error("Error running tests:", error);
  prisma.$disconnect();
});
