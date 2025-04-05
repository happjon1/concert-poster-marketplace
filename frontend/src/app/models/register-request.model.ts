export interface RegisterRequest {
  email: string;
  passwordHash: string; // Change this from password to passwordHash
  name?: string;
}
