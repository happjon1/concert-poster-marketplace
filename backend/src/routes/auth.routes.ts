import { Router } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", registerUser as import("express").RequestHandler);
router.post("/login", loginUser as import("express").RequestHandler);
router.get(
  "/me",
  authMiddleware as import("express").RequestHandler,
  getCurrentUser as import("express").RequestHandler
);

export default router;
