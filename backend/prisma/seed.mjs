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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
