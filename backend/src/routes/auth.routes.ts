import { Router, Request, Response, NextFunction } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  refreshToken,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * Authentication Routes
 *
 * POST /api/auth/register - Register a new user
 * POST /api/auth/login - Login with email and password
 * POST /api/auth/refresh - Refresh authentication token
 * POST /api/auth/logout - Logout user
 * GET /api/auth/me - Get current user profile
 */

// Type assertion for controller functions
type ControllerFunction = (req: Request, res: Response) => Promise<Response>;

// Wrapper to make controller functions compatible with Express
const wrapController = (controllerFn: ControllerFunction) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    controllerFn(req, res).catch(next);
  };
};

// Public routes (no authentication required)
router.post("/register", wrapController(registerUser));
router.post("/login", wrapController(loginUser));
router.post("/refresh", wrapController(refreshToken));

// Protected routes (require authentication)
router.post("/logout", authMiddleware, wrapController(logoutUser));
router.get("/me", authMiddleware, wrapController(getCurrentUser));

export default router;
