export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}
