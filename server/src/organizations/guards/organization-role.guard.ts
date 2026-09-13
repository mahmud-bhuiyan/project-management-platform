import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrganizationRole } from '@prisma/client';
import { ApiException } from '../../common/exceptions/api.exception.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.types.js';
import { REQUIRE_ORGANIZATION_ROLES_KEY } from '../decorators/require-organization-roles.decorator.js';
import { OrganizationsService } from '../organizations.service.js';
import type { OrganizationAuthenticatedRequest } from '../organizations.types.js';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      REQUIRE_ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<OrganizationAuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ApiException(
        'Access token required',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const organizationId = this.resolveOrganizationId(request);
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );

    request.organizationMembership = membership;

    if (!requiredRoles.includes(membership.role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private resolveOrganizationId(request: AuthenticatedRequest): string {
    const rawId = request.params.organizationId ?? request.params.id;
    const organizationId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!organizationId) {
      throw new ApiException(
        'Organization id is required',
        'VALIDATION_ERROR',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return organizationId;
  }
}
