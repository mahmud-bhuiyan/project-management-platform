import type { CookieOptions, Response } from 'express';
import { API_GLOBAL_PREFIX } from '../common/config/api-prefix.js';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getRefreshTokenCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: `/${API_GLOBAL_PREFIX}/auth`,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, getRefreshTokenCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshTokenCookieOptions());
}
