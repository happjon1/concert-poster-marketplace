import { User } from "@prisma/client";

/**
 * Safe user type that excludes sensitive fields
 */
export type SafeUser = Omit<User, "passwordHash">;
export type CreateUser = Pick<User, "email" | "passwordHash" | "name">;
export type LoginUser = Pick<User, "email" | "passwordHash">;
