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

const prisma = new PrismaClient();

// Add these helper functions before your main function
function generateRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
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
    const eventDate = generateRandomDate(startDate, endDate);
    const venue = pickRandom(createdVenues);
    const headliner = pickRandom(createdArtists);

    events.push({
      name: `${headliner.name} at ${venue.name}`,
      date: eventDate,
      venueId: venue.id,
      jambaseId: `event-${i + 1000}`,
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

  // Events
  const phishEvent = await prisma.event.create({
    data: {
      name: "Phish at Red Rocks",
      jambaseId: "event-001",
      date: new Date("2024-07-01"),
      venueId: redRocks.id,
      artists: { create: { artistId: phish.id } },
    },
  });

  const deadEvent = await prisma.event.create({
    data: {
      name: "Grateful Dead Reunion",
      jambaseId: "event-002",
      date: new Date("2024-08-15"),
      venueId: redRocks.id,
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

  // Seed bulk data
  await seedBulkData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
