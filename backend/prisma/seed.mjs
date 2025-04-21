// prisma/seed.ts
import {
  PrismaClient,
  OrderStatus,
  PosterStatus,
  TransactionStatus,
  TransactionType,
  UploadedBy,
  OrderActor,
} from "@prisma/client";
import bcrypt from "bcrypt";
import readline from "readline";
import dayjs from "dayjs";

// Initialize PrismaClient but don't connect yet
const prisma = new PrismaClient();

// Check environment type with multiple checks for better safety
const isTestEnvironment = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";
const isCICD =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isPrismaStudio = process.env.PRISMA_STUDIO === "true";
const isManualSeed = process.env.MANUAL_SEED === "true";
const isAutoConfirm = process.env.AUTO_CONFIRM === "true"; // Add auto-confirm option

// Get database URL to check where we're about to seed
const databaseUrl = process.env.DATABASE_URL || "unknown";
console.log(
  `Database URL: ${databaseUrl.substring(
    0,
    databaseUrl.indexOf("@") > 0 ? databaseUrl.indexOf("@") : 20
  )}...`
);

// Environment detection with more detailed logging
console.log(`
🌱 Seed script environment:
- NODE_ENV: ${process.env.NODE_ENV || "undefined"}
- Test Environment: ${isTestEnvironment ? "YES" : "NO"}
- Production: ${isProduction ? "YES" : "NO"}
- CI/CD: ${isCICD ? "YES" : "NO"}
- Prisma Studio: ${isPrismaStudio ? "YES" : "NO"}
- Manual Seed: ${isManualSeed ? "YES" : "NO"}
- Auto Confirm: ${isAutoConfirm ? "YES" : "NO"}
`);

// If this is a test environment, we'll exit early without seeding any data
if (isTestEnvironment) {
  console.log("🧪 TEST environment detected - skipping all seed data");
  process.exit(0);
}

// Don't run in production unless explicitly authorized
if (isProduction && !isManualSeed) {
  console.error(
    "⛔ Refusing to seed PRODUCTION database without explicit authorization."
  );
  console.error("To seed production, set MANUAL_SEED=true in environment.");
  process.exit(1);
}

// For development environments, add a safeguard prompt unless CI/CD or manual seed
const isDevelopmentWithoutOverride =
  !isTestEnvironment &&
  !isProduction &&
  !isCICD &&
  !isManualSeed &&
  !isPrismaStudio &&
  !isAutoConfirm;

// Create a function to prompt for confirmation
async function confirmSeed() {
  if (!isDevelopmentWithoutOverride) {
    return true; // No need for confirmation in other environments
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `
⚠️  WARNING: You are about to seed the DEVELOPMENT database.
    This will DELETE ALL EXISTING DATA in the database.
    
    Database: ${databaseUrl}
    
    Type 'YES' to confirm or anything else to cancel: `,
      (answer) => {
        rl.close();
        if (answer.trim().toUpperCase() === "YES") {
          console.log("✅ Seed confirmed, proceeding...");
          resolve(true);
        } else {
          console.log("❌ Seed cancelled.");
          resolve(false);
        }
      }
    );
  });
}

// Add these helper functions before your main function
function generateRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper to generate date components from a Date object
function generateDateComponents(date) {
  const dayjsDate = dayjs(date);
  return {
    startYear: dayjsDate.year(),
    startMonth: dayjsDate.month() + 1, // dayjs months are 0-indexed
    startDay: dayjsDate.date(),
  };
}

// Helper to generate a random end date for multi-day events
function generateEndDate(startDate, maxDays = 3) {
  // 70% chance of single-day event
  if (Math.random() < 0.7) {
    return null;
  }

  // Generate random number of additional days (1-maxDays)
  const additionalDays = Math.floor(Math.random() * maxDays) + 1;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + additionalDays);
  return endDate;
}

// Helper to generate end date components
function generateEndDateComponents(endDate) {
  if (!endDate) return { endYear: null, endMonth: null, endDay: null };

  const dayjsDate = dayjs(endDate);
  return {
    endYear: dayjsDate.year(),
    endMonth: dayjsDate.month() + 1,
    endDay: dayjsDate.date(),
  };
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomSubset(array, min = 1, max = 3) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

async function seedBulkData() {
  console.log("Starting bulk data seeding...");

  // Data for generating realistic entities
  const artistNames = [
    // Classic Rock & Alternative
    "Phish",
    "Grateful Dead",
    "Pink Floyd",
    "Led Zeppelin",
    "The Rolling Stones",
    "The Beatles",
    "Queen",
    "The Who",
    "The Doors",
    "Jimi Hendrix Experience",
    "Nirvana",
    "Pearl Jam",
    "Soundgarden",
    "Alice In Chains",
    "Stone Temple Pilots",
    "Red Hot Chili Peppers",
    "Metallica",
    "Black Sabbath",
    "Iron Maiden",
    "AC/DC",

    // Indie & Modern Rock
    "Arctic Monkeys",
    "Tame Impala",
    "The Strokes",
    "Radiohead",
    "LCD Soundsystem",
    "The War on Drugs",
    "The National",
    "Vampire Weekend",
    "Fleet Foxes",
    "Arcade Fire",
    "Bon Iver",
    "Wilco",
    "The Black Keys",
    "Jack White",
    "Queens of the Stone Age",
    "The Flaming Lips",
    "Modest Mouse",
    "Spoon",
    "TV on the Radio",
    "Yeah Yeah Yeahs",

    // Electronic & Dance
    "Daft Punk",
    "Disclosure",
    "Deadmau5",
    "The Chemical Brothers",
    "Justice",
    "Aphex Twin",
    "Bonobo",
    "Four Tet",
    "Flying Lotus",
    "Floating Points",
    "Underworld",
    "Massive Attack",
    "Portishead",
    "Björk",
    "Gorillaz",
    "The Prodigy",
    "Orbital",
    "Fatboy Slim",
    "The Avalanches",
    "SBTRKT",

    // Hip-Hop & R&B
    "Kendrick Lamar",
    "Tyler, The Creator",
    "Frank Ocean",
    "Anderson .Paak",
    "Thundercat",
    "A Tribe Called Quest",
    "The Roots",
    "Wu-Tang Clan",
    "MF DOOM",
    "J Dilla",
    "Erykah Badu",
    "D'Angelo",
    "Janelle Monáe",
    "SZA",
    "Solange",
    "Outkast",
    "Run The Jewels",
    "Madlib",
    "Flying Lotus",
    "Kaytranada",

    // Jam Bands & Psychedelic
    "The String Cheese Incident",
    "Widespread Panic",
    "moe.",
    "Umphrey's McGee",
    "Goose",
    "Billy Strings",
    "King Gizzard & The Lizard Wizard",
    "Khruangbin",
    "TAUK",
    "Pigeons Playing Ping Pong",
    "The Disco Biscuits",
    "STS9",
    "Lotus",
    "Dopapod",
    "The Motet",
    "Ghost Light",
    "Spafford",
    "Turkuaz",
    "Lettuce",
    "Medeski Martin & Wood",

    // Folk & Americana
    "The Avett Brothers",
    "Mumford & Sons",
    "Old Crow Medicine Show",
    "The Lumineers",
    "Lord Huron",
    "First Aid Kit",
    "The Tallest Man on Earth",
    "Iron & Wine",
    "The Head and the Heart",
    "The Civil Wars",
    "Gregory Alan Isakov",
    "Ray LaMontagne",
    "The Decemberists",
    "Brandi Carlile",
    "Jason Isbell",
    "Mandolin Orange",
    "Trampled by Turtles",
    "The Wood Brothers",
    "Shakey Graves",
    "Mipso",

    // World & Fusion
    "Tinariwen",
    "Bombino",
    "Rodrigo y Gabriela",
    "Femi Kuti",
    "Buena Vista Social Club",
    "Toots & The Maytals",
    "Antibalas",
    "Dakhabrakha",
    "Gogol Bordello",
    "The Cat Empire",

    // Generated Names - The [X] [Y] Pattern
    "The Electric Bears",
    "The Cosmic Wolves",
    "The Midnight Tigers",
    "The Royal Ghosts",
    "The Black Waves",
    "The Silver Dreams",
    "The Golden Stars",
    "The Crystal Mountains",
    "The Midnight Rivers",
    "The Lunar Tides",
    "The Neon Forest",
    "The Desert Owls",
    "The Diamond Dust",
    "The Velvet Echo",
    "The Sonic Frontier",

    // Solo Artists with Band Format
    "James Smith & The Bears",
    "Sarah Johnson & The Wolves",
    "David Williams & The Tigers",
    "Emma Brown & The Ghosts",
    "Michael Jones & The Waves",
    "Lucy Miller & The Dreams",
    "Alex Davis & The Stars",
    "Jake Wilson & The Mountains",
    "Sophia Taylor & The Rivers",
    "Oliver Thomas & The Tides",

    // Solo Artists
    "James Smith",
    "Sarah Johnson",
    "David Williams",
    "Emma Brown",
    "Michael Jones",
    "Lucy Miller",
    "Alex Davis",
    "Jake Wilson",
    "Sophia Taylor",
    "Oliver Thomas",
    "Eleanor Moore",
    "Benjamin Harris",
    "Charlotte Clark",
    "Samuel Lewis",
    "Grace Hall",
    "Daniel King",
    "Amelia Green",
    "Matthew Baker",
    "Olivia Turner",
    "William Evans",

    // More Creative Band Names
    "Cosmic Dust Bunnies",
    "Strange Weather",
    "Liquid Sunshine",
    "Forest for the Trees",
    "Penny Revolution",
    "Velvet Thunder",
    "Phantom Limb",
    "Electric Octopus",
    "Quantum Mechanics",
    "Future Folk",
    "Analog Heart",
    "Memory Palace",
    "Hologram Jukebox",
    "Paper Lions",
    "Silent Partner",
    "Morning Teleportation",
    "Talking Machines",
    "Satellite Hearts",
    "Neon Coyote",
    "Dream Harvest",
  ];

  // Venue data
  const cities = [
    { city: "New York", state: "NY", country: "US" },
    { city: "Los Angeles", state: "CA", country: "US" },
    { city: "Chicago", state: "IL", country: "US" },
    { city: "Denver", state: "CO", country: "US" },
    { city: "Seattle", state: "WA", country: "US" },
    { city: "Austin", state: "TX", country: "US" },
    { city: "Nashville", state: "TN", country: "US" },
    { city: "New Orleans", state: "LA", country: "US" },
    { city: "Portland", state: "OR", country: "US" },
    { city: "San Francisco", state: "CA", country: "US" },
    { city: "Boston", state: "MA", country: "US" },
    { city: "Philadelphia", state: "PA", country: "US" },
  ];

  const venueTypes = [
    "Arena",
    "Hall",
    "Amphitheater",
    "Theater",
    "Stadium",
    "Club",
    "Lounge",
    "Garden",
  ];

  // Step 1: Create 200 artists with genres
  const genres = await prisma.genre.findMany();
  if (genres.length < 3) {
    console.log("Creating additional genres...");
    // Create more genres if needed
    const genreNames = [
      "Alternative",
      "Indie",
      "Metal",
      "Folk",
      "Electronic",
      "Hip-Hop",
      "Pop",
      "Blues",
      "Jazz",
    ];
    for (const name of genreNames) {
      await prisma.genre.create({
        data: {
          name,
          jambaseId: `genre-${name.toLowerCase().replace(/\s+/g, "-")}`,
        },
      });
    }
  }

  // Get all genres after potentially creating new ones
  const allGenres = await prisma.genre.findMany();

  console.log("Creating 200 artists...");
  const artistsToCreate = artistNames.slice(0, 200).map((name, index) => ({
    name,
    jambaseId: `artist-${name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[&.]/g, "")}-${index}`,
  }));

  await prisma.artist.createMany({
    data: artistsToCreate,
    skipDuplicates: true,
  });

  // Connect artists with genres
  const createdArtists = await prisma.artist.findMany();

  console.log(
    `Created ${createdArtists.length} artists. Assigning genres to artists...`
  );

  // Add genres to artists
  for (const artist of createdArtists) {
    const artistGenres = getRandomSubset(allGenres, 1, 3);
    for (const genre of artistGenres) {
      try {
        await prisma.artistGenre.create({
          data: {
            artistId: artist.id,
            genreId: genre.id,
          },
        });
      } catch (error) {
        // Skip if relationship already exists
        console.log(`Skipping duplicate genre for ${artist.name}`);
      }
    }
  }

  // Step 2: Create 60 venues
  console.log("Creating 60 venues...");
  const venueNames = [];
  for (const city of cities) {
    for (const type of venueTypes) {
      venueNames.push({
        name: `${city.city} ${type}`,
        city: city.city,
        state: city.state,
        country: city.country,
      });
    }
  }

  // Add some special venues with unique names
  const specialVenues = [
    {
      name: "Madison Square Garden",
      city: "New York",
      state: "NY",
      country: "US",
    },
    { name: "Hollywood Bowl", city: "Los Angeles", state: "CA", country: "US" },
    { name: "Ryman Auditorium", city: "Nashville", state: "TN", country: "US" },
    {
      name: "Red Rocks Amphitheatre",
      city: "Morrison",
      state: "CO",
      country: "US",
    },
    {
      name: "The Gorge Amphitheatre",
      city: "George",
      state: "WA",
      country: "US",
    },
    { name: "The Fillmore", city: "San Francisco", state: "CA", country: "US" },
    { name: "9:30 Club", city: "Washington", state: "DC", country: "US" },
    { name: "House of Blues", city: "Chicago", state: "IL", country: "US" },
    { name: "Beacon Theatre", city: "New York", state: "NY", country: "US" },
    { name: "The Forum", city: "Inglewood", state: "CA", country: "US" },
    { name: "Cain's Ballroom", city: "Tulsa", state: "OK", country: "US" },
    { name: "First Avenue", city: "Minneapolis", state: "MN", country: "US" },
  ];

  venueNames.push(...specialVenues);

  const venuesToCreate = venueNames.slice(0, 60).map((venue, index) => ({
    name: venue.name,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    jambaseId: `venue-${venue.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${index}`,
  }));

  await prisma.venue.createMany({
    data: venuesToCreate,
    skipDuplicates: true,
  });

  const createdVenues = await prisma.venue.findMany();
  console.log(`Created ${createdVenues.length} venues`);

  // Step 3: Create 500 events
  console.log("Creating 500 events...");
  const startDate = new Date(2023, 0, 1); // Jan 1, 2023
  const endDate = new Date(2025, 11, 31); // Dec 31, 2025

  const events = [];
  for (let i = 0; i < 500; i++) {
    const eventStartDate = generateRandomDate(startDate, endDate);
    const eventEndDate = generateEndDate(eventStartDate);
    const venue = pickRandom(createdVenues);
    const headliner = pickRandom(createdArtists);

    // Generate date components
    const dateComponents = generateDateComponents(eventStartDate);
    const endDateComponents = generateEndDateComponents(eventEndDate);

    events.push({
      name: `${headliner.name} at ${venue.name}`,
      startDate: eventStartDate,
      endDate: eventEndDate,
      venueId: venue.id,
      jambaseId: `event-${i + 1000}`,
      ...dateComponents,
      ...endDateComponents,
    });
  }

  // Create events in chunks to avoid timeout
  const chunkSize = 50;
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    console.log(`Creating events ${i + 1} to ${i + chunk.length}...`);

    // Create each event and its artist relationships
    for (const eventData of chunk) {
      const newEvent = await prisma.event.create({
        data: eventData,
      });

      // Add 1-3 artists to each event
      const eventArtists = getRandomSubset(createdArtists, 1, 3);

      for (const artist of eventArtists) {
        await prisma.eventArtist.create({
          data: {
            eventId: newEvent.id,
            artistId: artist.id,
          },
        });
      }
    }
  }

  console.log(`Created 500 events with artists`);
  console.log("✅ Bulk data seeding completed!");
}

async function resetDatabase() {
  try {
    // Disable foreign key checks
    console.log("Disabling foreign key constraints...");
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    console.log("Starting database reset...");

    // Delete all data from tables in reverse dependency order
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "OrderStateHistory" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "VerificationImage" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Order" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Bid" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "PosterEvent" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "PosterArtist" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Poster" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "EventArtist" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Event" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Venue" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Artist" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Genre" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Address" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE;`;

    // Re-enable foreign key checks
    console.log("Re-enabling foreign key constraints...");
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;

    console.log("Database reset completed successfully!");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}

async function main() {
  // First check if we should proceed with seeding
  const shouldProceed = await confirmSeed();
  if (!shouldProceed) {
    console.log("Database seeding cancelled.");
    process.exit(0);
  }

  console.log("Starting database seeding...");

  // Reset the database with direct SQL commands
  await resetDatabase();

  // Hash passwords for users
  const adminPasswordHash = await bcrypt.hash("securepassword123", 10);
  const verifierPasswordHash = await bcrypt.hash("securepassword123", 10);
  const buyerPasswordHash = await bcrypt.hash("securepassword123", 10);
  const sellerPasswordHash = await bcrypt.hash("securepassword123", 10);

  // Check if the user already exists
  const existingAdminUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });

  const adminUser = existingAdminUser
    ? existingAdminUser // Use the existing user
    : await prisma.user.create({
        data: {
          email: "admin@example.com",
          passwordHash: adminPasswordHash,
          name: "Admin User",
          isAdmin: true,
        },
      });

  // Create the Address separately and connect it to the User
  const adminAddress = await prisma.address.create({
    data: {
      userId: adminUser.id, // Connect to the created User
      address1: "1 Admin Blvd", // Use address1 instead of street
      address2: null, // Optional field
      city: "Admin City",
      state: "AC",
      province: null, // Optional field
      zip: "12345", // Optional field
      country: "US",
      isValidated: true,
    },
  });

  // Update the User with the defaultAddressId
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { defaultAddressId: adminAddress.id },
  });

  console.log("✅ Admin user and address created successfully!");

  // Verifier user
  const verifierUser = await prisma.user.create({
    data: {
      email: "verifier@example.com",
      passwordHash: verifierPasswordHash,
      name: "Verifier User",
    },
  });

  // Create the Address separately and connect it to the User
  const verifierAddress = await prisma.address.create({
    data: {
      userId: verifierUser.id, // Connect to the created User
      address1: "99 Verify Lane",
      city: "Checktown",
      state: "VT",
      country: "US",
      isValidated: true,
    },
  });

  // Update the User with the defaultAddressId
  await prisma.user.update({
    where: { id: verifierUser.id },
    data: { defaultAddressId: verifierAddress.id },
  });

  // Genres
  const rock = await prisma.genre.create({
    data: { name: "Psychedelic Rock", jambaseId: "genre-rock" },
  });

  const jam = await prisma.genre.create({
    data: { name: "Jam Band", jambaseId: "genre-jam" },
  });

  // Artists
  const phish = await prisma.artist.create({
    data: {
      name: "Phish",
      jambaseId: "artist-phish",
      genres: { create: [{ genreId: rock.id }, { genreId: jam.id }] },
    },
  });

  const dead = await prisma.artist.create({
    data: {
      name: "Grateful Dead",
      jambaseId: "artist-dead",
      genres: { create: [{ genreId: jam.id }] },
    },
  });

  // Venue
  const redRocks = await prisma.venue.upsert({
    where: { jambaseId: "venue-redrocks" },
    update: {
      name: "Red Rocks Amphitheatre",
      city: "Morrison",
      state: "CO",
      country: "US",
    },
    create: {
      name: "Red Rocks Amphitheatre",
      jambaseId: "venue-redrocks",
      city: "Morrison",
      state: "CO",
      country: "US",
    },
  });

  // Events with new schema
  const phishStartDate = new Date("2024-07-01");
  const phishEventData = {
    name: "Phish at Red Rocks",
    jambaseId: "event-001",
    startDate: phishStartDate,
    endDate: null, // Single day event
    startYear: phishStartDate.getFullYear(),
    startMonth: phishStartDate.getMonth() + 1,
    startDay: phishStartDate.getDate(),
    endYear: null,
    endMonth: null,
    endDay: null,
    venueId: redRocks.id,
  };

  const phishEvent = await prisma.event.create({
    data: {
      ...phishEventData,
      artists: { create: { artistId: phish.id } },
    },
  });

  // Festival example - multi-day event
  const deadStartDate = new Date("2024-08-15");
  const deadEndDate = new Date("2024-08-17"); // 3-day festival
  const deadEventData = {
    name: "Grateful Dead Reunion Festival",
    jambaseId: "event-002",
    startDate: deadStartDate,
    endDate: deadEndDate,
    startYear: deadStartDate.getFullYear(),
    startMonth: deadStartDate.getMonth() + 1,
    startDay: deadStartDate.getDate(),
    endYear: deadEndDate.getFullYear(),
    endMonth: deadEndDate.getMonth() + 1,
    endDay: deadEndDate.getDate(),
    venueId: redRocks.id,
  };

  const deadEvent = await prisma.event.create({
    data: {
      ...deadEventData,
      artists: { create: { artistId: dead.id } },
    },
  });

  // Users (buyer/seller)
  const user = await prisma.user.create({
    data: {
      email: "buyer@example.com",
      passwordHash: buyerPasswordHash,
      name: "Test Buyer",
      addresses: {
        create: [
          {
            address1: "123 Main St",
            city: "Denver",
            state: "CO",
            country: "US",
            isValidated: true,
          },
        ],
      },
    },
    include: { addresses: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultAddressId: user.addresses[0].id },
  });

  const seller = await prisma.user.create({
    data: {
      email: "seller@example.com",
      passwordHash: sellerPasswordHash,
      name: "Poster Seller",
      addresses: {
        create: [
          {
            address1: "456 Oak St",
            city: "Boulder",
            state: "CO",
            country: "US",
            isValidated: true,
          },
        ],
      },
    },
    include: { addresses: true },
  });

  await prisma.user.update({
    where: { id: seller.id },
    data: { defaultAddressId: seller.addresses[0].id },
  });

  // Posters
  const poster1 = await prisma.poster.create({
    data: {
      title: "Phish Foil Poster",
      description: "Limited edition foil from Red Rocks show.",
      imageUrls: ["https://example.com/poster1.jpg"],
      type: "EVENT",
      isAuction: true,
      startPrice: 100,
      auctionEndAt: new Date(Date.now() + 5 * 86400000),
      status: PosterStatus.ACTIVE,
      signedByArtist: true,
      sellerId: seller.id,
      widthInInches: 18,
      heightInInches: 24,
      editionNumber: "45/100",
    },
  });

  // Then create the associations separately
  await prisma.posterEvent.create({
    data: {
      posterId: poster1.id,
      eventId: phishEvent.id,
    },
  });

  await prisma.posterArtist.create({
    data: {
      posterId: poster1.id,
      artistId: phish.id,
    },
  });

  const poster2 = await prisma.poster.create({
    data: {
      title: "Grateful Dead Classic Poster",
      description: "Vintage 1970s style design.",
      imageUrls: ["https://example.com/poster2.jpg"],
      type: "TOUR",
      isAuction: false,
      buyNowPrice: 80,
      status: PosterStatus.ACTIVE,
      sellerId: seller.id,
      widthInInches: 16,
      heightInInches: 20,
      editionNumber: "30/250",
      events: { create: { eventId: deadEvent.id } },
      artists: { create: { artistId: dead.id } },
    },
  });

  // Bid
  const bid1 = await prisma.bid.create({
    data: {
      amount: 120,
      posterId: poster1.id,
      userId: user.id,
    },
  });

  // Order
  const order1 = await prisma.order.create({
    data: {
      buyerId: user.id,
      sellerId: seller.id,
      posterId: poster1.id,
      status: OrderStatus.VERIFYING,
      sellerPayoutInCents: 10000,
    },
  });

  // Create the OrderStateHistory records separately
  await prisma.orderStateHistory.createMany({
    data: [
      {
        orderId: order1.id,
        fromState: "PENDING",
        toState: "SHIP_TO_US",
        event: "label_created",
        actor: OrderActor.SELLER,
      },
      {
        orderId: order1.id,
        fromState: "SHIP_TO_US",
        toState: "VERIFYING",
        event: "arrived",
        actor: OrderActor.SYSTEM,
      },
    ],
  });

  // Transactions
  await prisma.transaction.create({
    data: {
      orderId: order1.id,
      userId: user.id,
      amount: 120,
      currency: "USD",
      paymentMethod: "card",
      transactionType: TransactionType.BID_HOLD,
      status: TransactionStatus.COMPLETED,
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order1.id,
      userId: seller.id,
      amount: 100,
      currency: "USD",
      paymentMethod: "stripe_transfer",
      transactionType: TransactionType.PAYOUT,
      status: TransactionStatus.PENDING,
    },
  });

  // Create a User first
  const testUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: buyerPasswordHash, // Reuse an existing hash
    },
  });

  // Create an Address that references the User
  await prisma.address.create({
    data: {
      userId: testUser.id, // Reference the created User
      address1: "123 Main St", // Use address1 instead of street
      city: "Test City",
      country: "Test Country",
      isValidated: true,
    },
  });

  console.log(
    "✅ Fully seeded including admin, verifier, users, posters, and full flow."
  );

  // Skip bulk data seeding in test environment
  if (isTestEnvironment) {
    console.log("🧪 Test environment detected - skipping bulk data generation");
    return;
  }

  console.log("Starting bulk data generation for development environment...");

  // Seed bulk data
  await seedBulkData();

  console.log(
    "Creating additional poster-event and poster-artist relationships..."
  );

  // Get all posters, artists, and events
  const allPosters = await prisma.poster.findMany();
  const allArtists = await prisma.artist.findMany();
  const allEvents = await prisma.event.findMany();

  if (
    allPosters.length === 0 ||
    allArtists.length === 0 ||
    allEvents.length === 0
  ) {
    console.log("Not enough data to create relationships");
    return;
  }

  // For each poster that doesn't have any artists, add 1-3 artists
  for (const poster of allPosters) {
    // Check if poster already has artists
    const existingArtists = await prisma.posterArtist.findMany({
      where: { posterId: poster.id },
    });

    if (existingArtists.length === 0) {
      // Add 1-3 random artists
      const artistsToAdd = getRandomSubset(allArtists, 1, 3);
      console.log(
        `Adding ${artistsToAdd.length} artists to poster ${poster.id}`
      );

      for (const artist of artistsToAdd) {
        try {
          await prisma.posterArtist.create({
            data: {
              posterId: poster.id,
              artistId: artist.id,
            },
          });
        } catch (error) {
          console.log(
            `Error adding artist ${artist.id} to poster ${poster.id}: ${error.message}`
          );
        }
      }
    }

    // Check if poster already has events
    const existingEvents = await prisma.posterEvent.findMany({
      where: { posterId: poster.id },
    });

    if (existingEvents.length === 0) {
      // Add 1-2 random events
      const eventsToAdd = getRandomSubset(allEvents, 1, 2);
      console.log(`Adding ${eventsToAdd.length} events to poster ${poster.id}`);

      for (const event of eventsToAdd) {
        try {
          await prisma.posterEvent.create({
            data: {
              posterId: poster.id,
              eventId: event.id,
            },
          });
        } catch (error) {
          console.log(
            `Error adding event ${event.id} to poster ${poster.id}: ${error.message}`
          );
        }
      }
    }
  }

  console.log("✅ Finished creating additional relationships");

  // Create 100 posters with diverse properties
  console.log("Creating 100 diverse posters for sale...");

  // Get existing sellers or create new ones if needed
  async function getSellerIds() {
    let sellers = await prisma.user.findMany({
      where: { passwordHash: { not: "" } }, // Use empty string instead of null
      take: 5,
    });

    // If we don't have enough sellers, create more
    if (sellers.length < 5) {
      const additionalSellersNeeded = 5 - sellers.length;
      console.log(`Creating ${additionalSellersNeeded} additional sellers`);

      for (let i = 0; i < additionalSellersNeeded; i++) {
        const newSellerHash = await bcrypt.hash("securepassword123", 10);
        const newSeller = await prisma.user.create({
          data: {
            email: `seller${i + sellers.length}@example.com`,
            passwordHash: newSellerHash,
            name: `Poster Seller ${i + sellers.length}`,
            addresses: {
              create: [
                {
                  address1: `${1000 + i} Seller St`,
                  city: pickRandom([
                    "Denver",
                    "Boulder",
                    "Austin",
                    "Portland",
                    "Nashville",
                  ]),
                  state: pickRandom(["CO", "TX", "OR", "TN", "CA"]),
                  country: "US",
                  isValidated: true,
                },
              ],
            },
          },
          include: { addresses: true },
        });

        // Set default address
        await prisma.user.update({
          where: { id: newSeller.id },
          data: { defaultAddressId: newSeller.addresses[0].id },
        });

        sellers.push(newSeller);
      }
    }

    return sellers.map((s) => s.id);
  }

  // Create the posters
  const createDiversePosters = async () => {
    const sellerIds = await getSellerIds();
    const allArtists = await prisma.artist.findMany();
    const allEvents = await prisma.event.findMany();

    if (allArtists.length < 10 || allEvents.length < 10) {
      console.error("Not enough artists or events to create diverse posters");
      return;
    }

    // Create posters in batches to avoid timeouts
    const totalPosters = 100;
    const batchSize = 10;

    for (let batch = 0; batch < totalPosters / batchSize; batch++) {
      console.log(
        `Creating posters batch ${batch + 1}/${totalPosters / batchSize}...`
      );

      for (let i = 0; i < batchSize; i++) {
        const posterIndex = batch * batchSize + i;
        const isAuction = Math.random() > 0.6; // 40% auctions, 60% buy now

        try {
          // Create poster data based on schema
          const posterData = {
            title: `${pickRandom([
              "Limited",
              "Exclusive",
              "Rare",
              "Vintage",
              "Classic",
              "Special",
            ])} ${pickRandom([
              "Edition",
              "Series",
              "Collection",
              "Release",
              "Print",
            ])} Poster`,
            description: pickRandom([
              "Beautiful concert poster with vibrant colors and detailed artwork.",
              "Rare limited edition poster from an iconic show.",
              "Collector's item featuring premium printing techniques.",
              "Stunning artwork commemorating a legendary performance.",
              "Official merchandise with unique design elements.",
              "Hand-numbered concert poster with holographic elements.",
              "Tour poster designed by a renowned artist.",
              "Striking visual design capturing the spirit of the performance.",
              "Exclusive release featuring metallic ink details.",
              "Museum-quality print perfect for framing and display.",
            ]),
            imageUrls: [
              `https://picsum.photos/seed/${Math.random() * 9999}/600/800`,
              `https://picsum.photos/seed/${Math.random() * 9999}/600/800`,
              `https://picsum.photos/seed/${Math.random() * 9999}/600/800`,
            ].slice(0, Math.floor(Math.random() * 3) + 1), // 1-3 images
            type: pickRandom(["EVENT", "TOUR", "PROMO", "ART_PRINT", "OTHER"]), // Using correct enum values
            isAuction: isAuction,
            status: pickRandom([
              PosterStatus.ACTIVE,
              PosterStatus.ACTIVE,
              PosterStatus.ACTIVE,
              PosterStatus.PENDING_REVIEW,
            ]), // Bias toward active
            signedByArtist: Math.random() > 0.7, // 30% chance of being signed
            signedByMusician: Math.random() > 0.8, // 20% chance of being signed by musician
            isNumbered: Math.random() > 0.3, // 70% chance of being numbered
            widthInInches: pickRandom([11, 13, 16, 18, 20, 24]),
            heightInInches: pickRandom([17, 19, 20, 24, 28, 36]),
            editionNumber:
              Math.random() > 0.3
                ? `${Math.floor(Math.random() * 500) + 1}/${
                    Math.floor(Math.random() * 1000) + 500
                  }`
                : null, // 70% chance of having edition number
            variant: pickRandom([
              "Regular",
              "Foil",
              "Holographic",
              "Glow in the Dark",
              null,
              null,
              null,
            ]), // 40% chance of variant
            notes:
              Math.random() > 0.7
                ? pickRandom([
                    "Limited run",
                    "Artist proof",
                    "Test print",
                    "Special commission",
                    "Festival exclusive",
                  ])
                : null,
            paperType: pickRandom([
              "Glossy",
              "Matte",
              "Cardstock",
              "Recycled",
              "Fine Art",
              "Textured",
              "Canvas",
            ]),
            sellerId: pickRandom(sellerIds),
          };

          // Set price based on auction or buy now
          if (isAuction) {
            posterData.startPrice = Math.floor(Math.random() * 200) + 30; // $30-$230

            // Set auction end date between 1 and 14 days in the future
            const daysToAdd = Math.floor(Math.random() * 14) + 1;
            const auctionEndDate = new Date();
            auctionEndDate.setDate(auctionEndDate.getDate() + daysToAdd);
            posterData.auctionEndAt = auctionEndDate;
          } else {
            posterData.buyNowPrice = Math.floor(Math.random() * 300) + 50; // $50-$350
          }

          // Create the poster
          const poster = await prisma.poster.create({
            data: posterData,
          });

          // Add 1-3 artists
          const artistsForPoster = getRandomSubset(allArtists, 1, 3);
          for (const artist of artistsForPoster) {
            await prisma.posterArtist.create({
              data: {
                posterId: poster.id,
                artistId: artist.id,
              },
            });
          }

          // Add 1-2 events
          const eventsForPoster = getRandomSubset(allEvents, 1, 2);
          for (const event of eventsForPoster) {
            await prisma.posterEvent.create({
              data: {
                posterId: poster.id,
                eventId: event.id,
              },
            });
          }

          // For auction posters, occasionally add bids
          if (isAuction && Math.random() > 0.7) {
            // 30% of auctions have bids
            const bidCount = Math.floor(Math.random() * 5) + 1; // 1-5 bids
            let currentBid = posterData.startPrice;

            // Get potential bidders (all users except the seller)
            const allUsers = await prisma.user.findMany({
              where: { id: { not: posterData.sellerId } },
            });

            if (allUsers.length > 0) {
              for (let b = 0; b < bidCount; b++) {
                // Increase bid by 10-30%
                currentBid += Math.floor(
                  currentBid * (Math.random() * 0.2 + 0.1)
                );

                await prisma.bid.create({
                  data: {
                    amount: currentBid,
                    posterId: poster.id,
                    userId: pickRandom(allUsers).id,
                  },
                });
              }
            }
          }

          console.log(`Created poster ${posterIndex + 1}: ${posterData.title}`);
        } catch (error) {
          console.error(
            `Error creating poster ${posterIndex + 1}:`,
            error.message
          );
        }
      }
    }

    console.log("✅ Created 100 diverse posters with mixed properties");
  };

  await createDiversePosters();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
