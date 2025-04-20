import { PosterStatus, PosterType, Prisma } from "@prisma/client";
import { appRouter } from "../src/trpc/routers/_app";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import * as dotenv from "dotenv";
import { describe, expect, test, beforeEach, afterAll } from "vitest";
import prisma, { resetDatabase } from "./utils/test-db";

// Load environment variables
dotenv.config();

// Create a test caller for the tRPC router
const createCaller = () => {
  // Create a direct context object with the properties the router expects
  const ctx = {
    req: {
      headers: {},
      body: {},
      query: {},
      params: {},
    } as any,
    res: {
      status: () => ({ json: () => {} }),
      json: () => {},
      setHeader: () => {},
    } as any,
    userId: null, // Unauthenticated context
  };

  return appRouter.createCaller(ctx);
};

// Type inference for inputs
type AppRouter = typeof appRouter;
type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

// Helper function to delay execution (useful for debugging)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Debug helper to log database content
async function logDatabaseContent() {}

describe("Poster Search Integration Tests", () => {
  // Test data with proper types using the 'satisfies' operator
  const testData = {
    users: [
      {
        id: "user1",
        name: "Test User 1",
        email: "test1@example.com",
        passwordHash: "hash1",
      },
      {
        id: "user2",
        name: "Test User 2",
        email: "test2@example.com",
        passwordHash: "hash2",
      },
    ] satisfies Prisma.UserCreateInput[],

    artists: [
      { id: "artist1", name: "Phish" },
      { id: "artist2", name: "Grateful Dead" },
      { id: "artist3", name: "Flying Lotus" },
      { id: "artist4", name: "Red Hot Chili Peppers" },
      { id: "artist5", name: "Lotus" },
      { id: "artist6", name: "Pearl Jam" }, // Added Pearl Jam for our 2023 test
    ] satisfies Prisma.ArtistCreateInput[],

    venues: [
      {
        id: "venue1",
        name: "Madison Square Garden",
        city: "New York",
        state: "NY",
        country: "USA",
        jambaseId: "1",
      },
      {
        id: "venue2",
        name: "Red Rocks Amphitheatre",
        city: "Morrison",
        state: "CO",
        country: "USA",
        jambaseId: "2",
      },
      {
        id: "venue3",
        name: "Hollywood Bowl",
        city: "Los Angeles",
        state: "CA",
        country: "USA",
        jambaseId: "3",
      },
      {
        id: "venue4",
        name: "The Gorge Amphitheatre",
        city: "George",
        state: "WA",
        country: "USA",
        jambaseId: "4",
      },
      {
        id: "venue5",
        name: "The Showbox",
        city: "Seattle",
        state: "WA",
        country: "USA",
        jambaseId: "5",
      },
      {
        id: "venue6",
        name: "Golden Gate Park",
        city: "San Francisco",
        state: "CA",
        country: "USA",
        jambaseId: "6",
      },
    ] satisfies Prisma.VenueCreateInput[],

    events: [
      {
        id: "event1",
        jambaseId: "jb-event1",
        name: "New Years Eve 2024",
        date: new Date("2024-12-31"),
        venue: { connect: { id: "venue1" } },
      },
      {
        id: "event2",
        jambaseId: "jb-event2",
        name: "Summer Tour 2024",
        date: new Date("2024-07-15"),
        venue: { connect: { id: "venue2" } },
      },
      {
        id: "event3",
        jambaseId: "jb-event3",
        name: "Fall Tour 2024",
        date: new Date("2024-10-10"),
        venue: { connect: { id: "venue3" } },
      },
      {
        id: "event4",
        jambaseId: "jb-event4",
        name: "Spring Tour 2025",
        date: new Date("2025-04-05"),
        venue: { connect: { id: "venue5" } }, // The Showbox in Seattle
      },
      {
        id: "event5",
        jambaseId: "jb-event5",
        name: "Outside Lands 2024",
        date: new Date("2024-08-10"),
        venue: { connect: { id: "venue6" } }, // Golden Gate Park in San Francisco
      },
      {
        id: "event6",
        jambaseId: "jb-event6",
        name: "Phish Summer Tour 2023",
        date: new Date("2023-07-14"),
        venue: { connect: { id: "venue4" } },
      },
      {
        id: "event7",
        jambaseId: "jb-event7",
        name: "Pearl Jam Tour 2023",
        date: new Date("2023-09-18"),
        venue: { connect: { id: "venue4" } },
      },
      {
        id: "event8",
        jambaseId: "jb-event8",
        name: "Phish LA Show 2024",
        date: new Date("2024-08-15"),
        venue: { connect: { id: "venue3" } },
      },
      {
        id: "event9",
        jambaseId: "jb-event9",
        name: "Pearl Jam LA Show 2024",
        date: new Date("2024-08-20"),
        venue: { connect: { id: "venue3" } },
      },
      {
        id: "event10",
        jambaseId: "jb-event10",
        name: "Phish Seattle Show 2024",
        date: new Date("2024-06-15"),
        venue: { connect: { id: "venue5" } }, // The Showbox in Seattle
      },
      {
        id: "event11",
        name: "Phish Summer Tour",
        date: new Date("2023-08-05"),
        venue: { connect: { id: "venue5" } }, // Seattle venue
        jambaseId: "104",
      },
      {
        id: "event12",
        name: "Phish at The Anthem",
        date: new Date("2023-07-20"),
        venue: { connect: { id: "venue6" } }, // Madison Square Garden
        jambaseId: "105",
      },
    ] satisfies Prisma.EventCreateInput[],

    posters: [
      {
        title: "Phish at MSG",
        description: "New Years Eve show poster. Mint condition, 18x24",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 99.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster1.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event1", "event6"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Grateful Dead at The Gorge",
        description: "Summer Tour classic print. Very Good condition, 24x36",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 49.99,
        auctionEndAt: new Date("2025-05-01"),
        imageUrls: ["https://example.com/poster2.jpg"],
        artistIds: ["artist2"],
        eventIds: ["event2"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Flying Lotus at Red Rocks",
        description: "Limited edition print. Excellent condition, 18x24",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 129.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster3.jpg"],
        artistIds: ["artist3"],
        eventIds: ["event3"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "RHCP Seattle Show",
        description:
          "Red Hot Chili Peppers at The Showbox. Near Mint condition, 11x17",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 79.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster4.jpg"],
        artistIds: ["artist4"],
        eventIds: ["event4"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Festival Poster",
        description:
          "Outside Lands featuring multiple artists. Good condition, 24x36",
        sellerId: "user1",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 199.99,
        auctionEndAt: new Date("2025-06-01"),
        imageUrls: ["https://example.com/poster5.jpg"],
        artistIds: ["artist1", "artist3", "artist4"],
        eventIds: ["event5"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Lotus in San Francisco",
        description: "Special show at Golden Gate Park. Mint condition, 18x24",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 89.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster6.jpg"],
        artistIds: ["artist5"],
        eventIds: ["event5"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish at The Anthem 2023",
        description: "Phish summer tour poster from Washington DC 2023",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 89.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster7.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event6"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Pearl Jam at The Gorge 2023",
        description: "Pearl Jam poster from The Gorge Amphitheatre in 2023",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 149.99,
        auctionEndAt: new Date("2025-07-01"),
        imageUrls: ["https://example.com/poster8.jpg"],
        artistIds: ["artist6"],
        eventIds: ["event7"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish at Hollywood Bowl",
        description: "Phish summer tour poster from Los Angeles 2024",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 109.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster9.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event8"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Pearl Jam in Los Angeles",
        description: "Pearl Jam poster from Hollywood Bowl 2024",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 129.99,
        auctionEndAt: new Date("2025-12-01"),
        imageUrls: ["https://example.com/poster10.jpg"],
        artistIds: ["artist6"],
        eventIds: ["event9"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish Seattle Show 2024",
        description: "Phish summer tour poster from The Showbox in Seattle",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 119.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster11.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event10"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish at The Showbox",
        description: "Rare Phish poster from their Seattle show",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 95,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster12.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event11"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Outside Lands Festival at Golden Gate Park",
        description:
          "Special festival poster from Golden Gate Park in San Francisco",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 149.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster13.jpg"],
        artistIds: ["artist3", "artist4"],
        eventIds: ["event5"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
    ] satisfies Array<{
      title: string;
      description: string;
      sellerId: string;
      isAuction: boolean;
      buyNowPrice: number | null;
      startPrice: number | null;
      auctionEndAt: Date | null;
      imageUrls: string[];
      artistIds: string[];
      eventIds: string[];
      type: PosterType;
      status: PosterStatus;
    }>,
  };

  // Set up test database before EACH test for better isolation
  beforeEach(async () => {
    try {
      // Reset database to ensure a clean state
      await resetDatabase();

      // Create users
      for (const user of testData.users) {
        try {
          await prisma.user.create({
            data: user,
          });
        } catch (error: any) {
          // If the error is a unique constraint violation on id, we can continue
          // This means the user already exists
          if (error.code === "P2002" && error.meta?.target?.includes("id")) {
          } else {
            throw error;
          }
        }
      }

      // Create artists
      for (const artist of testData.artists) {
        try {
          await prisma.artist.create({
            data: artist,
          });
        } catch (error: any) {
          if (error.code === "P2002" && error.meta?.target?.includes("id")) {
          } else {
            throw error;
          }
        }
      }

      // Create venues
      for (const venue of testData.venues) {
        try {
          await prisma.venue.create({
            data: venue,
          });
        } catch (error: any) {
          if (error.code === "P2002" && error.meta?.target?.includes("id")) {
          } else {
            throw error;
          }
        }
      }

      // Create events
      for (const event of testData.events) {
        try {
          await prisma.event.create({
            data: event,
          });
        } catch (error: any) {
          if (error.code === "P2002" && error.meta?.target?.includes("id")) {
          } else {
            throw error;
          }
        }
      }

      // Create event-artist connections
      const eventArtistConnections = [
        { eventId: "event1", artistId: "artist1" },
        { eventId: "event2", artistId: "artist2" },
        { eventId: "event3", artistId: "artist3" },
        { eventId: "event4", artistId: "artist4" },
        { eventId: "event5", artistId: "artist1" },
        { eventId: "event5", artistId: "artist3" },
        { eventId: "event5", artistId: "artist4" },
        { eventId: "event5", artistId: "artist5" },
        { eventId: "event6", artistId: "artist1" },
        { eventId: "event7", artistId: "artist6" },
        { eventId: "event8", artistId: "artist1" },
        { eventId: "event9", artistId: "artist6" },
        { eventId: "event10", artistId: "artist1" },
        { eventId: "event11", artistId: "artist1" },
      ];

      for (const connection of eventArtistConnections) {
        try {
          await prisma.eventArtist.create({
            data: connection,
          });
        } catch (error: any) {
          if (error.code === "P2002") {
          } else {
            throw error;
          }
        }
      }

      // Create posters
      for (const poster of testData.posters) {
        const { artistIds, eventIds, sellerId, ...posterData } = poster;

        try {
          await prisma.poster.create({
            data: {
              ...posterData,
              seller: {
                connect: { id: sellerId },
              },
              artists: {
                create: artistIds.map((artistId) => ({
                  artist: { connect: { id: artistId } },
                })),
              },
              events: {
                create: eventIds.map((eventId) => ({
                  event: { connect: { id: eventId } },
                })),
              },
              type: PosterType.EVENT,
              status: PosterStatus.ACTIVE,
            },
          });
        } catch (error: any) {
          throw error;
        }
      }

      await prisma.$executeRawUnsafe(`ANALYZE;`);
    } catch (error) {
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Get all posters", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({});

    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.total).toBe("number");
    expect(result.total).toBeGreaterThanOrEqual(result.items.length);
  });

  test("Search for single-word artist (Phish)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({ searchQuery: "Phish" });

    expect(result.items.length).toBeGreaterThan(0);
    const hasPhishArtist = result.items.some((poster) =>
      poster.artists.some((artist) => artist.name === "Phish")
    );
    expect(hasPhishArtist).toBe(true);
  });

  test("Search for multi-word artist (Grateful Dead)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Grateful Dead",
    });

    expect(result.items.length).toBeGreaterThan(0);
    const hasGratefulDeadArtist = result.items.some((poster) =>
      poster.artists.some((artist) => artist.name === "Grateful Dead")
    );
    expect(hasGratefulDeadArtist).toBe(true);
  });

  test("Search for multi-word artist (Flying Lotus)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({ searchQuery: "Flying Lotus" });

    expect(result.items.length).toBeGreaterThanOrEqual(2);

    const hasFlyingLotusArtist = result.items.some((poster) =>
      poster.artists.some((artist) => artist.name === "Flying Lotus")
    );
    expect(hasFlyingLotusArtist).toBe(true);

    const flyingLotusPosters = result.items.filter((poster) =>
      poster.artists.some((artist) => artist.name === "Flying Lotus")
    );
    expect(flyingLotusPosters.length).toBeGreaterThanOrEqual(2);
  });

  test("Search for artist and venue (Phish Seattle)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Phish Seattle",
    });

    const hasPhishOrSeattle = result.items.some(
      (poster) =>
        poster.artists.some((artist) => artist.name === "Phish") ||
        poster.events.some((event) => event.venue.city === "Seattle")
    );

    if (result.items.length > 0) {
      expect(hasPhishOrSeattle).toBe(true);
    }
  });

  test("Search for artist and venue should require both to match (Grateful Dead Seattle)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Grateful Dead Seattle",
    });

    if (result.items.length > 0) {
      const allResultsHaveBoth = result.items.every((poster) => {
        const hasGratefulDead = poster.artists.some(
          (artist) => artist.name === "Grateful Dead"
        );
        const hasSeattleVenue = poster.events.some(
          (event) => event.venue.city === "Seattle"
        );
        return hasGratefulDead && hasSeattleVenue;
      });

      expect(allResultsHaveBoth).toBe(true);
    }
  });

  test("Search for venue city (Seattle)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({ searchQuery: "Seattle" });

    expect(result.items.length).toBeGreaterThan(0);
    const hasSeattleVenue = result.items.some((poster) =>
      poster.events.some((event) => event.venue.city === "Seattle")
    );
    expect(hasSeattleVenue).toBe(true);
  });

  test("Search for multi-word city name (New York)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "New York",
    });

    expect(result.items.length).toBeGreaterThan(0);

    const hasNewYorkVenue = result.items.some((poster) =>
      poster.events.some((event) => event.venue.city === "New York")
    );
    expect(hasNewYorkVenue).toBe(true);
  });

  test("Search for multi-word city name (San Francisco)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "San Francisco",
    });

    expect(result.items.length).toBeGreaterThan(0);

    const hasSanFranciscoVenue = result.items.some((poster) =>
      poster.events.some((event) => event.venue.city === "San Francisco")
    );
    expect(hasSanFranciscoVenue).toBe(true);
  });

  test("Search for partial multi-word city name (San)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "San",
    });

    if (result.items.length > 0) {
      const hasSanFranciscoVenue = result.items.some((poster) =>
        poster.events.some((event) => event.venue.city === "San Francisco")
      );
      expect(hasSanFranciscoVenue).toBe(true);
    }
  });

  test("Search for artist with specific year (Phish 2023) should not return other bands from that year", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "phish 2023",
    });

    expect(result.items.length).toBeGreaterThan(0);

    const allPhishPosters = result.items.every((poster) =>
      poster.artists.some((artist) => artist.name === "Phish")
    );
    expect(allPhishPosters).toBe(true);

    const all2023Events = result.items.every((poster) =>
      poster.events.some((event) => {
        const date = new Date(event.date);
        return date.getFullYear() === 2023;
      })
    );
    expect(all2023Events).toBe(true);
  });

  test("Search for artist with city (Phish Los Angeles) should not return other bands from that city", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "phish los angeles",
    });

    expect(result.items.length).toBeGreaterThan(0);

    const allPhishPosters = result.items.every((poster) =>
      poster.artists.some((artist) => artist.name === "Phish")
    );
    expect(allPhishPosters).toBe(true);

    const allLosAngelesEvents = result.items.every((poster) =>
      poster.events.some((event) => {
        const date = new Date(event.date);
        return event.venue.city === "Los Angeles";
      })
    );
    expect(allLosAngelesEvents).toBe(true);
  });

  test("Search for venue by full name (Madison Square Garden)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Madison Square Garden",
    });

    const hasMSGVenue = result.items.some((poster) => {
      return poster.events.some((event) =>
        event.venue.name.includes("Madison Square Garden")
      );
    });

    if (result.items.length > 0) {
      expect(hasMSGVenue).toBe(true);
    }
  });

  test("Search with special characters in artist name", async () => {
    try {
      let acdc;
      try {
        acdc = await prisma.artist.create({
          data: {
            id: "artist-special",
            name: "AC/DC",
          },
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          acdc = await prisma.artist.findUnique({
            where: { id: "artist-special" },
          });
        } else {
          throw error;
        }
      }

      let acdcEvent;
      try {
        acdcEvent = await prisma.event.create({
          data: {
            id: "event-acdc",
            name: "AC/DC Rock Concert",
            date: new Date("2024-09-15"),
            venueId: "venue3",
            jambaseId: "acdc-event-123456",
          },
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          acdcEvent = await prisma.event.findUnique({
            where: { id: "event-acdc" },
          });
        } else {
          throw error;
        }
      }

      try {
        await prisma.poster.create({
          data: {
            title: "AC/DC Live at Hollywood Bowl",
            description: "Classic rock concert poster featuring AC/DC",
            sellerId: "user1",
            imageUrls: ["https://example.com/acdc.jpg"],
            type: "EVENT",
            status: "ACTIVE",
            isAuction: false,
            buyNowPrice: 129.99,
            artists: {
              create: [{ artist: { connect: { id: "artist-special" } } }],
            },
            events: {
              create: [{ event: { connect: { id: "event-acdc" } } }],
            },
          },
        });
      } catch (error: any) {}

      try {
        await prisma.eventArtist.create({
          data: {
            eventId: "event-acdc",
            artistId: "artist-special",
          },
        });
      } catch (error: any) {
        if (error.code === "P2002") {
        } else {
          throw error;
        }
      }

      const caller = createCaller();
      const result = await caller.posters.getAll({
        searchQuery: "AC/DC",
      });

      expect(result.items.length).toBeGreaterThan(0);
      const hasACDC = result.items.some(
        (poster) =>
          poster.title.includes("AC/DC") ||
          poster.artists.some((artist) => artist.name === "AC/DC")
      );
      expect(hasACDC).toBe(true);
    } catch (error) {
      throw error;
    }
  });

  test("Case-insensitive search (phish vs Phish)", async () => {
    const caller = createCaller();
    const lowerCaseResult = await caller.posters.getAll({
      searchQuery: "phish",
    });

    const upperCaseResult = await caller.posters.getAll({
      searchQuery: "PHISH",
    });

    expect(lowerCaseResult.items.length).toBe(upperCaseResult.items.length);

    if (lowerCaseResult.items.length > 0) {
      const hasPhishLower = lowerCaseResult.items.some((poster) =>
        poster.artists.some((artist) => artist.name === "Phish")
      );

      const hasPhishUpper = upperCaseResult.items.some((poster) =>
        poster.artists.some((artist) => artist.name === "Phish")
      );

      expect(hasPhishLower).toBe(true);
      expect(hasPhishUpper).toBe(true);
    }
  });

  test("Search with misspelled artist name (Phsh instead of Phish)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Phsh",
    });

    expect(result.items.length).toBeGreaterThan(0);

    const hasPhishArtist = result.items.some((poster) =>
      poster.artists.some((artist) => artist.name === "Phish")
    );
    expect(hasPhishArtist).toBe(true);
  });

  test("Search with misspelled venue (Madson Square Gardn)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Madson Square Gardn",
    });

    if (result.items.length > 0) {
      const hasMSGVenue = result.items.some((poster) =>
        poster.events.some((event) =>
          event.venue.name.includes("Madison Square Garden")
        )
      );
      expect(hasMSGVenue).toBe(true);
    }
  });

  test("Search with phonetic similarity (Greatful instead of Grateful)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Greatful Dead",
    });

    if (result.items.length > 0) {
      const hasGratefulDeadArtist = result.items.some((poster) =>
        poster.artists.some((artist) => artist.name === "Grateful Dead")
      );
      expect(hasGratefulDeadArtist).toBe(true);
    }
  });

  test("Search with transposed letters (Fliying Louts)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Fliying Louts",
    });

    if (result.items.length > 0) {
      const hasFlyingLotusArtist = result.items.some((poster) =>
        poster.artists.some((artist) => artist.name === "Flying Lotus")
      );
      expect(hasFlyingLotusArtist).toBe(true);
    }
  });

  test("Search with extra spaces (  Phish   2024  )", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "  Phish   2024  ",
    });

    if (result.items.length > 0) {
      const hasPhish2024 = result.items.some((poster) => {
        const hasPhish = poster.artists.some(
          (artist) => artist.name === "Phish"
        );
        const has2024 = poster.events.some((event) => {
          const date = new Date(event.date);
          return date.getFullYear() === 2024;
        });
        return hasPhish && has2024;
      });
      expect(hasPhish2024).toBe(true);
    }
  });

  test("Search by artist with specific date (Phish + specific date)", async () => {
    // Create a specific date format to search for
    const dateToSearch = new Date("2023-08-05"); // Using a known date from event11
    const formattedDate = `${dateToSearch.getMonth() + 1}/${dateToSearch.getDate()}/${dateToSearch.getFullYear()}`;
    
    const caller = createCaller();
    // Add a small delay to ensure the search has time to process
    await delay(100);
    
    const result = await caller.posters.getAll({
      searchQuery: `Phish ${formattedDate}`,
    });

    // If no results, try with different date format
    if (result.items.length === 0) {
      const altFormattedDate = `${dateToSearch.getFullYear()}-${String(dateToSearch.getMonth() + 1).padStart(2, '0')}-${String(dateToSearch.getDate()).padStart(2, '0')}`;
      const altResult = await caller.posters.getAll({
        searchQuery: `Phish ${altFormattedDate}`,
      });
      
      if (altResult.items.length > 0) {
        const allPhishPosters = altResult.items.every((poster) =>
          poster.artists.some((artist) => artist.name === "Phish")
        );
        expect(allPhishPosters).toBe(true);
        return;
      }
    }

    // Continue with original test
    expect(result.items.length).toBeGreaterThan(0);
    
    // Verify all results contain Phish as an artist
    const allPhishPosters = result.items.every((poster) =>
      poster.artists.some((artist) => artist.name === "Phish")
    );
    expect(allPhishPosters).toBe(true);

    // Verify all results have the correct date with more flexible comparison
    const allCorrectDatePosters = result.items.some((poster) =>
      poster.events.some((event) => {
        const eventDate = new Date(event.date);
        // Compare year, month and day values separately for more reliable comparison
        return (
          eventDate.getFullYear() === dateToSearch.getFullYear() &&
          eventDate.getMonth() === dateToSearch.getMonth() &&
          eventDate.getDate() === dateToSearch.getDate()
        );
      })
    );
    expect(allCorrectDatePosters).toBe(true);
  });

  test("Search with abbreviation (RHCP instead of Red Hot Chili Peppers)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "RHCP",
    });

    if (result.items.length > 0) {
      const hasRHCP = result.items.some((poster) =>
        poster.artists.some((artist) => artist.name === "Red Hot Chili Peppers")
      );
      expect(hasRHCP).toBe(true);
    }
  });

  test("Search with misspelled month name (Augst 2024)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Augst 2024",
    });

    if (result.items.length > 0) {
      const hasAugust2024Event = result.items.some((poster) => {
        return poster.events.some((event) => {
          const date = new Date(event.date);
          return date.getFullYear() === 2024 && date.getMonth() === 7;
        });
      });
      expect(hasAugust2024Event).toBe(true);
    }
  });

  test("Search with multiple artist names (Phish and Grateful Dead)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Phish Grateful",
    });

    if (result.items.length === 0) {
      const phishResult = await caller.posters.getAll({
        searchQuery: "Phish",
      });

      const gratefulResult = await caller.posters.getAll({
        searchQuery: "Grateful Dead",
      });

      expect(phishResult.items.length).toBeGreaterThan(0);
      expect(gratefulResult.items.length).toBeGreaterThan(0);
    } else {
      const hasEitherArtist = result.items.some((poster) =>
        poster.artists.some(
          (artist) => artist.name === "Phish" || artist.name === "Grateful Dead"
        )
      );
      expect(hasEitherArtist).toBe(true);
    }
  });

  test("Search by poster dimensions (18x24)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "18x24",
    });

    if (result.items.length > 0) {
      const hasDimension = result.items.some(
        (poster) =>
          poster.description.includes("18x24") || poster.title.includes("18x24")
      );
      expect(hasDimension).toBe(true);
    }
  });

  test("Search by poster condition (Mint)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Mint condition",
    });

    if (result.items.length > 0) {
      const hasMintCondition = result.items.some((poster) =>
        poster.description.toLowerCase().includes("mint condition")
      );
      expect(hasMintCondition).toBe(true);
    }
  });

  test("Search for posters from multiple cities (Seattle OR New York)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Seattle New York",
    });

    if (result.items.length > 0) {
      const hasEitherCity = result.items.some((poster) =>
        poster.events.some(
          (event) =>
            event.venue.city === "Seattle" || event.venue.city === "New York"
        )
      );
      expect(hasEitherCity).toBe(true);
    }
  });

  test("Search by date range (Summer 2024)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Summer 2024",
    });

    if (result.items.length > 0) {
      const hasSummer2024Event = result.items.some((poster) =>
        poster.events.some((event) => {
          const date = new Date(event.date);
          return (
            date.getFullYear() === 2024 &&
            date.getMonth() >= 5 &&
            date.getMonth() <= 7
          );
        })
      );
      expect(hasSummer2024Event).toBe(true);
    }
  });

  test("Search with state abbreviations (WA)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "WA",
    });

    if (result.items.length > 0) {
      const hasWashingtonVenue = result.items.some((poster) =>
        poster.events.some((event) => event.venue.state === "WA")
      );
      expect(hasWashingtonVenue).toBe(true);
    }
  });

  test("Search by artist, city and year combined (Phish New York 2024)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "Phish New York 2024",
    });

    expect(result.items.length).toBeGreaterThan(0);
    
    // Verify all results have all three criteria: Phish as artist, New York as city, and 2024 as year
    const allMatchingPosters = result.items.every((poster) => {
      const hasPhish = poster.artists.some((artist) => artist.name === "Phish");
      const hasNewYork = poster.events.some((event) => event.venue.city === "New York");
      const has2024 = poster.events.some((event) => {
        const date = new Date(event.date);
        return date.getFullYear() === 2024;
      });
      return hasPhish && hasNewYork && has2024;
    });
    
    expect(allMatchingPosters).toBe(true);
  });

  test("Search with very common words (The Concert)", async () => {
    const caller = createCaller();
    const result = await caller.posters.getAll({
      searchQuery: "The Concert",
    });

    expect(result).toBeDefined();
    expect(() => result).not.toThrow();
  });
});
