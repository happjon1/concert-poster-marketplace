import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../services/auth.service";

import { findUserById } from "../services/user.service";
import { SafeUser } from "../types";

// Extend Express Request type to include user properties
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: SafeUser;
    }
  }
}

/**
 * Authentication middleware - validates JWT tokens
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization header format",
      });
      return;
    }

    const userId = verifyToken(token);

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Middleware to load the user data
 * This can be used after authMiddleware when you need the full user object
 */
export const loadUserMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "User ID not found in request",
      });
      return;
    }

    const user = await findUserById(req.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    req.user = user as SafeUser;
    next();
  } catch (error) {
    console.error("User loading error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Admin authorization middleware - requires isAdmin: true
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Load user if not already loaded
    if (!req.user) {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const user = await findUserById(req.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (!user.isAdmin) {
        res.status(403).json({
          success: false,
          message: "Admin access required",
        });
        return;
      }

      req.user = user as SafeUser;
    } else if (!req.user.isAdmin) {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking admin status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Resource ownership middleware - ensures user can only access their own resources
 * @param userIdExtractor Function that extracts the owner ID from the request
 */
export const ownershipMiddleware = (
  userIdExtractor: (req: Request) => string | undefined
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const resourceOwnerId = userIdExtractor(req);

      if (!resourceOwnerId) {
        res.status(400).json({
          success: false,
          message: "Resource owner ID not found",
        });
        return;
      }

      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Check if this is the owner
      if (resourceOwnerId === req.userId) {
        return next();
      }

      // If not owner, check if admin
      if (!req.user) {
        const user = await findUserById(req.userId);

        if (!user) {
          res.status(404).json({
            success: false,
            message: "User not found",
          });
          return;
        }

        if (user.isAdmin) {
          next();
          return;
        }
      } else if (req.user.isAdmin) {
        next();
        return;
      }

      // Neither owner nor admin
      res.status(403).json({
        success: false,
        message: "Access denied: you don't own this resource",
      });
    } catch (error) {
      console.error("Ownership middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Error checking resource ownership",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};
