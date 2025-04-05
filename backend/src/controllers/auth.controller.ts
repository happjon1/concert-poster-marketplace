import { Request, Response } from "express";
import {
  login,
  generateRefreshToken,
  verifyRefreshToken,
  invalidateToken,
} from "../services/auth.service";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../services/user.service";
import { CreateUser, LoginUser, RefreshTokenPayload } from "../types";

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Register a new user
 */
export const registerUser = async (
  req: Request<{}, {}, CreateUser>,
  res: Response
) => {
  try {
    const { email, passwordHash, name } = req.body; // Changed: Using name instead of firstName/lastName

    // Validate required fields
    if (!email || !passwordHash) {
      return res.status(400).json({
        success: false,
        message: "Email and passwordHash are required",
      });
    }

    // Check if email already exists
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Create user
    const newUser = await createUser({
      email,
      passwordHash,
      name, // Changed: Using name instead of firstName/lastName
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Log in a user
 */
export const loginUser = async (
  req: Request<{}, {}, LoginUser>,
  res: Response
) => {
  try {
    const { email, passwordHash } = req.body;

    // Validate required fields
    if (!email || !passwordHash) {
      return res.status(400).json({
        success: false,
        message: "Email and passwordHash are required",
      });
    }

    const result = await login(email, passwordHash);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      success: true,
      ...result, // Should contain token, refreshToken, and user data
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Log out a user
 */
export const logoutUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the Authorization header

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No token provided",
      });
    }

    // Invalidate the token (e.g., add it to a blacklist or cache)
    // This requires implementing a token blacklist mechanism in your auth service
    const isBlacklisted = await invalidateToken(token);

    if (!isBlacklisted) {
      return res.status(500).json({
        success: false,
        message: "Failed to invalidate token",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Refresh authentication token
 */
export const refreshToken = async (
  req: Request<{}, {}, RefreshTokenPayload>,
  res: Response
) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify the refresh token
    const userId = await verifyRefreshToken(token);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Get the user
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new tokens
    const { token: newToken, refreshToken: newRefreshToken } =
      await generateRefreshToken(user.id);

    return res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(500).json({
      success: false,
      message: "Error refreshing token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
