import type { SafeUser } from '../users/users.types.js';

export type LoginResult = {
  accessToken: string;
  user: SafeUser;
};

export type LoginWithRefreshTokenResult = LoginResult & {
  refreshToken: string;
};

export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  platformRole: string;
};
