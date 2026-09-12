import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '../../auth/auth.types.js';
import { ApiException } from '../exceptions/api.exception.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.types.js';
import { extractBearerToken } from '../utils/auth-header.util.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new ApiException(
        'Access token required',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        platformRole: payload.platformRole,
      };
      return true;
    } catch {
      throw new ApiException(
        'Invalid or expired access token',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
