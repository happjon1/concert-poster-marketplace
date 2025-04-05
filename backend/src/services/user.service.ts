import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { Prisma, User } from "@prisma/client";
import crypto from "crypto";
import { CreateUser, SafeUser } from "../types";
import { ValidationError } from "../types/request.types";

/**
 * Find all users with safe data
 * @returns Promise with array of users (without passwords)
 */
export const findAllUsers = async (): Promise<SafeUser[]> => {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: false,
      phone: true,
      name: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      resetPasswordToken: true,
      resetPasswordExpires: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Find a user by ID with safe data
 * @param id User ID
 * @returns Promise with user (without password) or null
 */
export const findUserById = async (id: string): Promise<SafeUser | null> => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      passwordHash: false,
      phone: true,
      name: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      resetPasswordToken: true,
      resetPasswordExpires: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Find a user by email (includes password for auth)
 * @param email User email
 * @returns Promise with complete user or null
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

/**
 * Find users by name (partial match)
 * @param name Name to search for
 * @returns Promise with array of matching users (without passwords)
 */
export const findUsersByName = async (name: string): Promise<SafeUser[]> => {
  return prisma.user.findMany({
    where: {
      name: {
        contains: name,
        mode: "insensitive", // Case insensitive search
      },
    },
    select: {
      id: true,
      email: true,
      passwordHash: false,
      phone: true,
      name: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      resetPasswordToken: true,
      resetPasswordExpires: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Validate user data before creation/update
 * @param userData User data to validate
 * @param isUpdate Whether this is for an update (some fields optional)
 * @returns Array of validation errors (empty if valid)
 */
export const validateUserData = (
  userData: Partial<CreateUser>,
  isUpdate: boolean = false
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Email validation
  if (!isUpdate || userData.email !== undefined) {
    if (!userData.email) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push({ field: "email", message: "Email is invalid" });
    }
  }

  // Password validation
  if (!isUpdate || userData.passwordHash !== undefined) {
    if (!userData.passwordHash) {
      errors.push({ field: "passwordHash", message: "Password is required" });
    } else if (userData.passwordHash.length < 6) {
      errors.push({
        field: "passwordHash",
        message: "Password must be at least 6 characters",
      });
    }
  }

  // Name validation - optional but validate if provided
  if (userData.name !== undefined && userData.name?.trim() === "") {
    errors.push({ field: "name", message: "Name cannot be empty if provided" });
  }

  return errors;
};

/**
 * Create a new user
 * @param userData User data with password
 * @returns Promise with created user (without password)
 */
export const createUser = async (userData: CreateUser): Promise<SafeUser> => {
  // Validate user data
  const validationErrors = validateUserData(userData);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
  }

  // Hash the passwordHash
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.passwordHash, salt);

  const user = await prisma.user.create({
    data: {
      ...userData,
      passwordHash: hashedPassword,
    },
  });

  // Remove passwordHash from returned user
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as SafeUser;
};

/**
 * Update existing user
 * @param id User ID
 * @param userData Partial user data to update
 * @returns Promise with updated user (without password)
 */
export const updateUser = async (
  id: string,
  userData: Partial<User>
): Promise<SafeUser> => {
  // Validate user data
  const validationErrors = validateUserData(
    { ...userData, name: userData.name ?? undefined },
    true
  );
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
  }

  // If passwordHash is being updated, hash it first
  if (userData.passwordHash) {
    const salt = await bcrypt.genSalt(10);
    userData.passwordHash = await bcrypt.hash(userData.passwordHash, salt);
  }

  const user = await prisma.user.update({
    where: { id },
    data: userData,
  });

  // Remove passwordHash from returned user
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as SafeUser;
};

/**
 * Delete a user
 * @param id User ID
 * @returns Promise with deleted user
 */
export const deleteUser = async (id: string): Promise<SafeUser> => {
  const user = await prisma.user.delete({
    where: { id },
  });

  // Remove passwordHash from returned user
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as SafeUser;
};

/**
 * Compare plaintext password with hashed password
 * @param plainPassword Plain text password
 * @param hashedPassword Hashed password from database
 * @returns Promise with boolean result of comparison
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generate a password reset token for a user
 * @param userId User ID
 * @returns Object with token and expiry
 */
export const generatePasswordResetToken = async (
  userId: string
): Promise<{ token: string; expires: Date }> => {
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token (don't store plaintext tokens in DB)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiration (1 hour from now)
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  // Save to database
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    },
  });

  // Return the unhashed token (to send via email) and expiry
  return {
    token: resetToken,
    expires,
  };
};

/**
 * Verify a password reset token
 * @param token The reset token (unhashed)
 * @param email The user's email
 * @returns User ID if valid, null if invalid or expired
 */
export const verifyPasswordResetToken = async (
  token: string,
  email: string
): Promise<string | null> => {
  // Hash the provided token to compare with stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with matching token and email
  const user = await prisma.user.findFirst({
    where: {
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        gt: new Date(), // Token must not be expired
      },
    },
  });

  return user ? user.id : null;
};

/**
 * Reset a user's password using a valid token
 * @param userId User ID
 * @param newPassword New password to set
 * @returns Updated user without password
 */
export const resetPassword = async (
  userId: string,
  newPassword: string
): Promise<SafeUser> => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashedPassword,
      resetPasswordToken: null, // Clear the reset token
      resetPasswordExpires: null, // Clear the expiry
    },
  });

  // Remove passwordHash from returned user
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as SafeUser;
};
