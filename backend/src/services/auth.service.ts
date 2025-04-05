import * as jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { findUserByEmail, comparePassword } from "./user.service";

// Get JWT secrets from environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

// Simplified token payload with just the user ID
interface TokenPayload {
  id: string;
}

// In-memory token blacklist
const tokenBlacklist = new Set<string>();

/**
 * Generate an authentication token
 */
export const generateToken = (userId: string): string => {
  const payload: TokenPayload = { id: userId };

  const secret: jwt.Secret = JWT_SECRET;
  const signOptions: jwt.SignOptions = {
    expiresIn: "1h",
  };

  return jwt.sign(payload, secret, signOptions);
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = async (
  userId: string
): Promise<{ token: string; refreshToken: string }> => {
  const token = generateToken(userId);

  const refreshPayload = {
    id: userId,
    version: new Date().toISOString(), // Include a timestamp to invalidate old tokens
  };

  const refreshOptions: jwt.SignOptions = {
    expiresIn: "7d", // Refresh tokens last longer
  };

  const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, refreshOptions);

  return {
    token,
    refreshToken,
  };
};

/**
 * Verify a refresh token and return the user ID if valid
 */
export const verifyRefreshToken = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as jwt.JwtPayload;

    // Make sure the decoded token contains a user ID
    if (!decoded || !decoded.id) {
      return null;
    }

    return decoded.id;
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    return null;
  }
};

/**
 * Login with email and password
 */
export const login = async (email: string, passwordHash: string) => {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(
    passwordHash,
    user.passwordHash
  );

  if (!isPasswordValid) {
    return null;
  }

  // Generate both tokens
  const { token, refreshToken } = await generateRefreshToken(user.id);

  // Return tokens and user data without sensitive information
  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || false,
    },
  };
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): string | null => {
  try {
    // Check if the token is blacklisted
    if (tokenBlacklist.has(token)) {
      console.error("Token is blacklisted");
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded.id;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

/**
 * Extract token from authorization header
 */
export const extractTokenFromHeader = (authHeader: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Invalidate a token by adding it to an in-memory blacklist
 * @param token The token to invalidate
 * @returns boolean indicating success
 */
export const invalidateToken = (token: string): boolean => {
  try {
    const expiration = getTokenExpiration(token); // Extract the token's expiration time
    if (!expiration) {
      throw new Error("Invalid token");
    }

    // Add the token to the in-memory blacklist
    tokenBlacklist.add(token);

    // Automatically remove the token from the blacklist after it expires
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, expiration * 1000);

    return true;
  } catch (error) {
    console.error("Error invalidating token:", error);
    return false;
  }
};

/**
 * Extract the expiration time from a JWT
 * @param token The JWT
 * @returns The expiration time in seconds, or null if invalid
 */
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    if (!payload.exp) {
      return null;
    }
    return payload.exp - Math.floor(Date.now() / 1000); // Time remaining in seconds
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};
