import { fail } from "node:assert";
import { SafeUser } from "./user.types";

/**
 * Token payload interface
 */
export interface TokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}
