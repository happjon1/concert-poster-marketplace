import { RequestHandler, Router } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", registerUser as RequestHandler);
router.post("/login", loginUser as RequestHandler);
router.get(
  "/me",
  authMiddleware as RequestHandler,
  getCurrentUser as RequestHandler
);

export default router;
