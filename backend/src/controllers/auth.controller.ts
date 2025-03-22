import { Request, Response } from "express";
import { login } from "../services/auth.service";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../services/user.service";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if email already exists
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Check if username already exists
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ message: "Username already in use" });
    }

    // Create user
    const user = await createUser({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password);

    if (!result) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error during login" });
  }
};
