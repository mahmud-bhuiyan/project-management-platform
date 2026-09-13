import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';

export const REQUIRE_ORGANIZATION_ROLES_KEY = 'requireOrganizationRoles';

export const ORGANIZATION_MANAGER_ROLES: OrganizationRole[] = [
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
];

export const RequireOrganizationRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(REQUIRE_ORGANIZATION_ROLES_KEY, roles);

export const RequireOrganizationManager = () =>
  RequireOrganizationRoles(...ORGANIZATION_MANAGER_ROLES);
