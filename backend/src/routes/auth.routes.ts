import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";

const router = Router();

router.post("/register", registerUser as import("express").RequestHandler);
router.post("/login", loginUser as import("express").RequestHandler);

export default router;
