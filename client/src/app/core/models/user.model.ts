export type PlatformRole = 'SUPERADMIN' | 'USER';

export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  avatarUrl: string | null;
  themePreference: ThemePreference;
  createdAt: string;
  updatedAt: string;
}
