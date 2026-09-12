import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ApiException } from '../exceptions/api.exception.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.types.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.platformRole === 'SUPERADMIN') {
      return true;
    }

    const bootstrapKey = request.headers['x-superadmin-key'];
    const configuredKey = process.env.SUPERADMIN_BOOTSTRAP_KEY;

    if (
      configuredKey &&
      typeof bootstrapKey === 'string' &&
      bootstrapKey === configuredKey
    ) {
      return true;
    }

    throw new ApiException(
      'Superadmin access required',
      'FORBIDDEN',
      HttpStatus.FORBIDDEN,
    );
  }
}
