import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  avatarUrl?: string;
  themePreference?: SafeUser['themePreference'];
};