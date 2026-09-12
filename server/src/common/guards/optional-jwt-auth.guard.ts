import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '../../auth/auth.types.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.types.js';
import { extractBearerToken } from '../utils/auth-header.util.js';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        platformRole: payload.platformRole,
      };
    } catch {
      // Leave request.user unset; downstream guards decide access.
    }

    return true;
  }
}
