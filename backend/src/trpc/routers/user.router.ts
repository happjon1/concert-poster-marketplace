import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js"; // Import shared Prisma instance

// ------------------- Helper Functions -------------------

/**
 * Find all users with safe data (no passwords)
 */
async function findAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      addresses: true, // Include user addresses
    },
  });
}

/**
 * Find a user by ID with safe data
 */
async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      addresses: true, // Include user addresses
      defaultAddress: true, // Include default address
    },
  });
}

/**
 * Create a new user
 */
async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string;
  isAdmin?: boolean;
}) {
  const hashedPassword = await bcrypt.hash(data.passwordHash, 10);

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      isAdmin: data.isAdmin || false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update a user
 */
async function updateUser(
  id: string,
  data: {
    email?: string;
    name?: string;
    phone?: string;
    isAdmin?: boolean;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      addresses: true, // Include user addresses
      defaultAddress: true, // Include default address
    },
  });
}

/**
 * Delete a user
 */
async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

/**
 * Create a new address for a user
 */
async function createAddress(
  userId: string,
  data: {
    label?: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    province?: string;
    zip?: string;
    country: string;
    isDefault?: boolean;
  }
) {
  const { isDefault, ...addressData } = data;

  // Check for duplicate addresses
  const existingAddresses = await prisma.address.findMany({
    where: {
      userId,
      address1: addressData.address1,
      city: addressData.city,
      country: addressData.country,
      // Only include optional fields if they have values
      ...(addressData.address2 ? { address2: addressData.address2 } : {}),
      ...(addressData.state ? { state: addressData.state } : {}),
      ...(addressData.province ? { province: addressData.province } : {}),
      ...(addressData.zip ? { zip: addressData.zip } : {}),
    },
  });

  if (existingAddresses.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This address already exists for this user",
    });
  }

  // Create the address
  const address = await prisma.address.create({
    data: {
      ...addressData,
      userId,
    },
  });

  // If this is set as default address, update the user's defaultAddressId
  if (isDefault) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultAddressId: address.id },
    });
  }

  return address;
}

/**
 * Update an existing address
 */
async function updateAddress(
  id: string,
  userId: string,
  data: {
    label?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    province?: string;
    zip?: string;
    country?: string;
    isDefault?: boolean;
  }
) {
  const { isDefault, ...addressData } = data;

  // Ensure the address belongs to the user
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address || address.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only update your own addresses",
    });
  }

  // Only check for duplicates if address fields are being changed
  if (
    addressData.address1 !== undefined ||
    addressData.address2 !== undefined ||
    addressData.city !== undefined ||
    addressData.state !== undefined ||
    addressData.province !== undefined ||
    addressData.zip !== undefined ||
    addressData.country !== undefined
  ) {
    // First, build the updated address by merging current and new data
    const updatedAddressData = {
      address1: addressData.address1 ?? address.address1,
      address2: addressData.address2 ?? address.address2,
      city: addressData.city ?? address.city,
      state: addressData.state ?? address.state,
      province: addressData.province ?? address.province,
      zip: addressData.zip ?? address.zip,
      country: addressData.country ?? address.country,
    };

    // Then check for existing addresses with the same fields
    const existingAddresses = await prisma.address.findMany({
      where: {
        userId,
        id: { not: id }, // Exclude the current address
        address1: updatedAddressData.address1,
        city: updatedAddressData.city,
        country: updatedAddressData.country,
        // Only include other fields if they have values
        ...(updatedAddressData.address2
          ? { address2: updatedAddressData.address2 }
          : {}),
        ...(updatedAddressData.state
          ? { state: updatedAddressData.state }
          : {}),
        ...(updatedAddressData.province
          ? { province: updatedAddressData.province }
          : {}),
        ...(updatedAddressData.zip ? { zip: updatedAddressData.zip } : {}),
      },
    });

    if (existingAddresses.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This address already exists for this user",
      });
    }
  }

  // Update the address
  const updatedAddress = await prisma.address.update({
    where: { id },
    data: addressData,
  });

  // If this is set as default address, update the user's defaultAddressId
  if (isDefault) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultAddressId: id },
    });
  }

  return updatedAddress;
}

/**
 * Delete an address
 */
async function deleteAddress(id: string, userId: string) {
  try {
    // First, fetch the address to return it later
    const addressToDelete = await prisma.address.findUnique({
      where: { id },
    });

    if (!addressToDelete || addressToDelete.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Address not found or you don't have permission to delete it",
      });
    }

    // 1. Check if this is a default address and handle that case
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultAddressId: true },
    });

    // If this is the default address, remove the default reference
    if (user?.defaultAddressId === id) {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultAddressId: null },
      });
    }

    // 2. Delete the address
    await prisma.address.delete({
      where: { id },
    });

    // Return the address that was deleted for type consistency
    return addressToDelete;
  } catch (error) {
    console.error("Error deleting address:", error);

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete address. Please try again.",
    });
  }
}

// ------------------- tRPC Router -------------------

export const userRouter = router({
  // Get all users (admin only in a real app)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // In a real app, check if the user is an admin
    return await findAllUsers();
  }),

  // Get user by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await findUserById(input.id);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Create new user (register)
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        passwordHash: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already in use",
        });
      }

      return await createUser(input);
    }),

  // Update user
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure users can only update their own profile (unless admin)
      if (input.id !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own profile",
        });
      }

      try {
        // Only include fields that exist in the Prisma schema
        return await prisma.user.update({
          where: { id: input.id },
          data: {
            email: input.email,
            name: input.name,
            phone: input.phone,
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isAdmin: true,
            stripeAccountId: true,
            defaultAddressId: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            addresses: true, // Include user addresses
            defaultAddress: true, // Include default address
          },
        });
      } catch (error) {
        if ((error as any).code === "P2002") {
          // Unique constraint error
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
        throw error;
      }
    }),

  // Delete user
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure users can only delete their own profile (unless admin)
      if (input.id !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own profile",
        });
      }

      try {
        return await deleteUser(input.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user",
        });
      }
    }),

  // ------------------- Address Management -------------------

  // Address schema for validation
  ...(() => {
    // Common address fields
    const addressBaseSchema = {
      label: z.string().optional(),
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      province: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      isDefault: z.boolean().optional(),
    };

    // Create address requires certain fields
    const createAddressSchema = z.object({
      ...addressBaseSchema,
      address1: z.string(), // Required for create
      city: z.string(), // Required for create
      country: z.string(), // Required for create
    });

    // Update address makes all fields optional
    const updateAddressSchema = z.object({
      id: z.string(),
      ...addressBaseSchema,
    });

    return {
      // Get user addresses
      getAddresses: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
          // Ensure users can only view their own addresses
          if (input.userId !== ctx.userId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only view your own addresses",
            });
          }

          return prisma.address.findMany({
            where: { userId: input.userId },
          });
        }),

      // Create address
      createAddress: protectedProcedure
        .input(createAddressSchema)
        .mutation(async ({ ctx, input }) => {
          return await createAddress(ctx.userId, input);
        }),

      // Update address
      updateAddress: protectedProcedure
        .input(updateAddressSchema)
        .mutation(async ({ ctx, input }) => {
          const { id, ...addressData } = input;
          return await updateAddress(id, ctx.userId, addressData);
        }),

      // Delete address
      deleteAddress: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          return await deleteAddress(input.id, ctx.userId);
        }),

      // Set default address
      setDefaultAddress: protectedProcedure
        .input(z.object({ addressId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          // Ensure the address belongs to the user
          const address = await prisma.address.findUnique({
            where: { id: input.addressId },
          });

          if (!address || address.userId !== ctx.userId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only set your own addresses as default",
            });
          }

          // Update user's default address
          try {
            // Use a transaction to ensure data consistency
            return await prisma.$transaction(async (prismaClient) => {
              // Update user to set the new default address
              const updatedUser = await prismaClient.user.update({
                where: { id: ctx.userId },
                data: { defaultAddressId: input.addressId },
                select: {
                  id: true,
                  email: true,
                  name: true,
                  phone: true,
                  isAdmin: true,
                  stripeAccountId: true,
                  defaultAddressId: true,
                  lastLogin: true,
                  createdAt: true,
                  updatedAt: true,
                  addresses: true,
                  defaultAddress: true,
                },
              });

              return updatedUser;
            });
          } catch (error) {
            console.error("Error setting default address:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to set default address",
            });
          }
        }),
    };
  })(),
});
