import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";

// JWT secret should be the same one used in auth.router.ts
const JWT_SECRET = process.env["JWT_SECRET"] || "default_secret";

/**
 * Verify JWT token and return user ID if valid
 */
function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Context type definition
 */
export interface Context {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  userId: string | null;
}

/**
 * Create context for tRPC requests
 */
export const createContext = ({
  req,
  res,
}: CreateExpressContextOptions): Context => {
  // Get the user from the authorization header
  const token = req.headers.authorization?.split(" ")[1];
  let userId: string | null = null;

  if (token) {
    userId = verifyToken(token);
  }

  return {
    req,
    res,
    userId,
  };
};
