import * as jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { findUserByEmail, comparePassword } from "./user.service";

export const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    role: user.role,
  };

  const secret: jwt.Secret = process.env.JWT_SECRET || "default_secret";
  const signOptions: jwt.SignOptions = {
    expiresIn:
      process.env.JWT_EXPIRES_IN && !isNaN(Number(process.env.JWT_EXPIRES_IN))
        ? Number(process.env.JWT_EXPIRES_IN)
        : "7d",
  };
  return jwt.sign(payload, secret, signOptions);
};

export const login = async (email: string, password: string) => {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      role: user.role,
    },
  };
};
