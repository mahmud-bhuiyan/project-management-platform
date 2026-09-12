import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
  platformRole: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
