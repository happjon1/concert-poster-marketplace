import { PosterStatus, PosterType, Prisma } from "@prisma/client";
import * as dotenv from "dotenv";
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import prisma, { resetDatabase } from "./utils/test-db";
import { searchForArtistWithCityAndYear } from "../src/fuzzy-poster-search/search-for-artist-with-city-and-year";

// Load environment variables
dotenv.config();

describe("searchForArtistWithCityAndYear Integration Tests", () => {
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
      { id: "artist5", name: "Pearl Jam" },
      { id: "artist6", name: "The Flaming Lips" },
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
        name: "Beacon Theatre",
        city: "New York",
        state: "NY",
        country: "USA",
        jambaseId: "4",
      },
      {
        id: "venue5",
        name: "The Gorge",
        city: "George",
        state: "WA",
        country: "USA",
        jambaseId: "5",
      },
    ] satisfies Prisma.VenueCreateInput[],

    events: [
      {
        id: "event1",
        jambaseId: "jb-event1",
        name: "New Years Eve 2023",
        startDate: new Date("2023-12-31"),
        startYear: 2023,
        startMonth: 12,
        startDay: 31,
        venue: { connect: { id: "venue1" } },
      },
      {
        id: "event2",
        jambaseId: "jb-event2",
        name: "New Years Eve 2024",
        startDate: new Date("2024-12-31"),
        startYear: 2024,
        startMonth: 12,
        startDay: 31,
        venue: { connect: { id: "venue1" } },
      },
      {
        id: "event3",
        jambaseId: "jb-event3",
        name: "Summer Tour 2023",
        startDate: new Date("2023-07-15"),
        startYear: 2023,
        startMonth: 7,
        startDay: 15,
        venue: { connect: { id: "venue2" } },
      },
      {
        id: "event4",
        jambaseId: "jb-event4",
        name: "Summer Tour 2024",
        startDate: new Date("2024-07-20"),
        startYear: 2024,
        startMonth: 7,
        startDay: 20,
        venue: { connect: { id: "venue2" } },
      },
      {
        id: "event5",
        jambaseId: "jb-event5",
        name: "Fall Tour LA 2023",
        startDate: new Date("2023-10-10"),
        startYear: 2023,
        startMonth: 10,
        startDay: 10,
        venue: { connect: { id: "venue3" } },
      },
      {
        id: "event6",
        jambaseId: "jb-event6",
        name: "Fall Tour LA 2024",
        startDate: new Date("2024-10-15"),
        startYear: 2024,
        startMonth: 10,
        startDay: 15,
        venue: { connect: { id: "venue3" } },
      },
      {
        id: "event7",
        jambaseId: "jb-event7",
        name: "Phish at Beacon 2023",
        startDate: new Date("2023-05-01"),
        startYear: 2023,
        startMonth: 5,
        startDay: 1,
        venue: { connect: { id: "venue4" } },
      },
      {
        id: "event8",
        jambaseId: "jb-event8",
        name: "Phish at Beacon 2024",
        startDate: new Date("2024-05-05"),
        startYear: 2024,
        startMonth: 5,
        startDay: 5,
        venue: { connect: { id: "venue4" } },
      },
      {
        id: "event9",
        jambaseId: "jb-event9",
        name: "Pearl Jam at Gorge 2023",
        startDate: new Date("2023-08-10"),
        startYear: 2023,
        startMonth: 8,
        startDay: 10,
        venue: { connect: { id: "venue5" } },
      },
      {
        id: "event10",
        jambaseId: "jb-event10",
        name: "Pearl Jam at Gorge 2024",
        startDate: new Date("2024-08-15"),
        startYear: 2024,
        startMonth: 8,
        startDay: 15,
        venue: { connect: { id: "venue5" } },
      },
      // Special test case: Multiple cities for the same artist in the same year
      {
        id: "event11",
        jambaseId: "jb-event11",
        name: "Phish at LA 2024",
        startDate: new Date("2024-09-01"),
        startYear: 2024,
        startMonth: 9,
        startDay: 1,
        venue: { connect: { id: "venue3" } },
      },
      // Special test case: Multiple events at the same venue
      {
        id: "event12",
        jambaseId: "jb-event12",
        name: "Phish 3-Night Run MSG 2024 Night 1",
        startDate: new Date("2024-10-01"),
        startYear: 2024,
        startMonth: 10,
        startDay: 1,
        venue: { connect: { id: "venue1" } },
      },
      {
        id: "event13",
        jambaseId: "jb-event13",
        name: "Phish 3-Night Run MSG 2024 Night 2",
        startDate: new Date("2024-10-02"),
        startYear: 2024,
        startMonth: 10,
        startDay: 2,
        venue: { connect: { id: "venue1" } },
      },
      {
        id: "event14",
        jambaseId: "jb-event14",
        name: "Phish 3-Night Run MSG 2024 Night 3",
        startDate: new Date("2024-10-03"),
        startYear: 2024,
        startMonth: 10,
        startDay: 3,
        venue: { connect: { id: "venue1" } },
      },
      // Special test case: Event with multiple artists
      {
        id: "event15",
        jambaseId: "jb-event15",
        name: "Festival 2024",
        startDate: new Date("2024-06-15"),
        startYear: 2024,
        startMonth: 6,
        startDay: 15,
        venue: { connect: { id: "venue2" } },
      },
    ] satisfies Prisma.EventCreateInput[],

    eventArtistConnections: [
      { eventId: "event1", artistId: "artist1" }, // Phish NYE 2023 MSG
      { eventId: "event2", artistId: "artist1" }, // Phish NYE 2024 MSG
      { eventId: "event3", artistId: "artist2" }, // GD Summer 2023 Red Rocks
      { eventId: "event4", artistId: "artist2" }, // GD Summer 2024 Red Rocks
      { eventId: "event5", artistId: "artist3" }, // Flying Lotus LA 2023
      { eventId: "event6", artistId: "artist3" }, // Flying Lotus LA 2024
      { eventId: "event7", artistId: "artist1" }, // Phish Beacon 2023
      { eventId: "event8", artistId: "artist1" }, // Phish Beacon 2024
      { eventId: "event9", artistId: "artist5" }, // Pearl Jam Gorge 2023
      { eventId: "event10", artistId: "artist5" }, // Pearl Jam Gorge 2024
      { eventId: "event11", artistId: "artist1" }, // Phish LA 2024
      { eventId: "event12", artistId: "artist1" }, // Phish MSG Run 2024 N1
      { eventId: "event13", artistId: "artist1" }, // Phish MSG Run 2024 N2
      { eventId: "event14", artistId: "artist1" }, // Phish MSG Run 2024 N3
      { eventId: "event15", artistId: "artist1" }, // Festival with multiple artists
      { eventId: "event15", artistId: "artist2" },
      { eventId: "event15", artistId: "artist3" },
      { eventId: "event15", artistId: "artist5" },
    ],

    posters: [
      // Phish at MSG posters
      {
        title: "Phish NYE 2023",
        description: "Phish New Years Eve show poster, Madison Square Garden",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 99.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster1.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event1"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish NYE 2024",
        description: "Phish New Years Eve show poster at MSG",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 149.99,
        auctionEndAt: new Date("2025-06-01"),
        imageUrls: ["https://example.com/poster2.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event2"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Grateful Dead posters
      {
        title: "Grateful Dead Red Rocks 2023",
        description: "Grateful Dead Summer Tour poster",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 89.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster3.jpg"],
        artistIds: ["artist2"],
        eventIds: ["event3"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Grateful Dead Red Rocks 2024",
        description: "Grateful Dead Summer Tour poster",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 94.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster4.jpg"],
        artistIds: ["artist2"],
        eventIds: ["event4"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Flying Lotus posters
      {
        title: "Flying Lotus LA 2023",
        description: "Flying Lotus at Hollywood Bowl",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 79.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster5.jpg"],
        artistIds: ["artist3"],
        eventIds: ["event5"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Flying Lotus LA 2024",
        description: "Flying Lotus at Hollywood Bowl",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 89.99,
        auctionEndAt: new Date("2025-07-01"),
        imageUrls: ["https://example.com/poster6.jpg"],
        artistIds: ["artist3"],
        eventIds: ["event6"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Phish at Beacon posters
      {
        title: "Phish Beacon Theatre 2023",
        description: "Phish at the Beacon Theatre in New York",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 109.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster7.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event7"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish Beacon Theatre 2024",
        description: "Phish at the Beacon Theatre in New York",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 119.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster8.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event8"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Pearl Jam posters
      {
        title: "Pearl Jam Gorge 2023",
        description: "Pearl Jam at The Gorge",
        sellerId: "user1",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 129.99,
        auctionEndAt: new Date("2025-05-01"),
        imageUrls: ["https://example.com/poster9.jpg"],
        artistIds: ["artist5"],
        eventIds: ["event9"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Pearl Jam Gorge 2024",
        description: "Pearl Jam at The Gorge",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 139.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster10.jpg"],
        artistIds: ["artist5"],
        eventIds: ["event10"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Special cases
      {
        title: "Phish Hollywood Bowl 2024",
        description: "Phish at the Hollywood Bowl",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 99.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster11.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event11"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish MSG Run 2024 - Full Set",
        description:
          "Phish 3-Night Run at Madison Square Garden - Complete Set",
        sellerId: "user2",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 299.99,
        auctionEndAt: new Date("2025-08-01"),
        imageUrls: ["https://example.com/poster12.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event12", "event13", "event14"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Phish MSG Run 2024 - Night 1",
        description: "Phish at Madison Square Garden - Night 1",
        sellerId: "user1",
        isAuction: false,
        buyNowPrice: 109.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster13.jpg"],
        artistIds: ["artist1"],
        eventIds: ["event12"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      {
        title: "Summer Festival 2024",
        description:
          "Multi-artist festival poster featuring Phish, Grateful Dead, and more",
        sellerId: "user2",
        isAuction: false,
        buyNowPrice: 159.99,
        startPrice: null,
        auctionEndAt: null,
        imageUrls: ["https://example.com/poster14.jpg"],
        artistIds: ["artist1", "artist2", "artist3", "artist5"],
        eventIds: ["event15"],
        type: PosterType.EVENT,
        status: PosterStatus.ACTIVE,
      },
      // Edge case: Multi-venue poster (Phish tour poster)
      {
        title: "Phish 2024 Tour Poster",
        description: "Poster featuring all Phish 2024 shows",
        sellerId: "user1",
        isAuction: true,
        buyNowPrice: null,
        startPrice: 199.99,
        auctionEndAt: new Date("2025-09-01"),
        imageUrls: ["https://example.com/poster15.jpg"],
        artistIds: ["artist1"],
        eventIds: [
          "event2",
          "event8",
          "event11",
          "event12",
          "event13",
          "event14",
        ],
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

  // Set up test database before all tests
  beforeAll(async () => {
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
      for (const connection of testData.eventArtistConnections) {
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

  test("Search for Phish + New York + 2024 should return only posters for New York shows in 2024", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phish",
      "New York",
      2024,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Phish shows in New York in 2024
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
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

    // Every poster should have Phish as an artist
    expect(
      posters.every((p) => p.artists.some((a) => a.artist.name === "Phish"))
    ).toBe(true);

    // Every poster should have at least one event in New York in 2024
    expect(
      posters.every((p) =>
        p.events.some((e) => {
          const date = new Date(e.event.startDate);
          return (
            e.event.venue.city === "New York" && date.getFullYear() === 2024
          );
        })
      )
    ).toBe(true);

    // No poster should have any events outside New York or not in 2024
    expect(
      posters.every((p) =>
        p.events.every((e) => {
          const date = new Date(e.event.startDate);
          return (
            e.event.venue.city === "New York" && date.getFullYear() === 2024
          );
        })
      )
    ).toBe(true);
  });

  test("Search for Phish + Los Angeles + 2024 should return only posters for LA shows in 2024", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phish",
      "Los Angeles",
      2024,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Phish shows in LA in 2024
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
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

    // Every poster should have Phish as an artist
    expect(
      posters.every((p) => p.artists.some((a) => a.artist.name === "Phish"))
    ).toBe(true);

    // Every poster should have at least one event in Los Angeles in 2024
    expect(
      posters.every((p) =>
        p.events.some((e) => {
          const date = new Date(e.event.startDate);
          return (
            e.event.venue.city === "Los Angeles" && date.getFullYear() === 2024
          );
        })
      )
    ).toBe(true);

    // Specifically check for the Phish Hollywood Bowl 2024 poster
    expect(posters.some((p) => p.title === "Phish Hollywood Bowl 2024")).toBe(
      true
    );
  });

  test("Search for Flying Lotus + Los Angeles + 2023 should return only posters for LA shows in 2023", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Flying Lotus",
      "Los Angeles",
      2023,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Flying Lotus shows in LA in 2023
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
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

    // Every poster should have Flying Lotus as an artist
    expect(
      posters.every((p) =>
        p.artists.some((a) => a.artist.name === "Flying Lotus")
      )
    ).toBe(true);

    // Every poster should have all events in Los Angeles in 2023
    expect(
      posters.every((p) =>
        p.events.every((e) => {
          const date = new Date(e.event.startDate);
          return (
            e.event.venue.city === "Los Angeles" && date.getFullYear() === 2023
          );
        })
      )
    ).toBe(true);
  });

  test("Search for Pearl Jam + George + 2024 should return only posters for Gorge shows in 2024", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Pearl Jam",
      "George",
      2024,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Pearl Jam shows at The Gorge in 2024
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
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

    // Every poster should have Pearl Jam as an artist
    expect(
      posters.every((p) => p.artists.some((a) => a.artist.name === "Pearl Jam"))
    ).toBe(true);

    // Every poster should have all events in George, WA in 2024
    expect(
      posters.every((p) =>
        p.events.every((e) => {
          const date = new Date(e.event.startDate);
          return e.event.venue.city === "George" && date.getFullYear() === 2024;
        })
      )
    ).toBe(true);
  });

  test("Search with misspelled artist name should still find results", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phsih", // Intentional misspelling
      "New York",
      2024,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Phish shows in New York in 2024
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
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

    // Every poster should have Phish as an artist despite the misspelling
    expect(
      posters.every((p) => p.artists.some((a) => a.artist.name === "Phish"))
    ).toBe(true);
  });

  test("Search with misspelled city name should still find results", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phish",
      "Nwe Yrok", // Intentional misspelling
      2024,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);

    // Check all results are for Phish shows in New York in 2024
    const posters = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
        },
      },
      include: {
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

    // Every poster should have events in New York despite the misspelling
    expect(
      posters.every((p) =>
        p.events.some((e) => e.event.venue.city === "New York")
      )
    ).toBe(true);
  });

  test("Case-insensitive search should work", async () => {
    const resultsLower = await searchForArtistWithCityAndYear(
      prisma,
      "phish", // lowercase
      "new york", // lowercase
      2024,
      0.3
    );

    const resultsUpper = await searchForArtistWithCityAndYear(
      prisma,
      "PHISH", // uppercase
      "NEW YORK", // uppercase
      2024,
      0.3
    );

    expect(resultsLower.length).toBeGreaterThan(0);
    expect(resultsLower.length).toBe(resultsUpper.length);
    expect(resultsLower.sort()).toEqual(resultsUpper.sort());
  });

  test("Search for non-existent combination should return empty array", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phish",
      "Chicago", // We don't have any Chicago venues in test data
      2024,
      0.3
    );

    expect(results.length).toBe(0);
  });

  test("Search for The Flaming Lips (not in test data) should return empty array", async () => {
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "The Flaming Lips", // Artist exists in DB but has no posters
      "New York",
      2024,
      0.3
    );

    expect(results.length).toBe(0);
  });

  test("Multiple events all must match criteria", async () => {
    // Test the case where a poster has multiple events, but only some match
    // The "Phish 2024 Tour Poster" has events in New York and Los Angeles in 2024

    // When searching for New York 2024, it should be included (tested above)

    // But when searching for events with non-matching criteria, it should be excluded
    const results = await searchForArtistWithCityAndYear(
      prisma,
      "Phish",
      "Boston", // We don't have any Boston events in the test data
      2024,
      0.3
    );

    const tourPoster = await prisma.poster.findMany({
      where: {
        id: {
          in: results,
        },
        title: "Phish 2024 Tour Poster",
      },
    });

    // The tour poster should NOT match since it doesn't have Boston events
    expect(tourPoster.length).toBe(0);
  });
});
