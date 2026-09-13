import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import type { Organization, OrganizationRole } from '@prisma/client';
import type { SafeUser } from '../users/users.types.js';

export type OrganizationMembershipContext = {
  organizationId: string;
  role: OrganizationRole;
};

export type OrganizationAuthenticatedRequest = AuthenticatedRequest & {
  organizationMembership?: OrganizationMembershipContext;
};

export type CompanyAdminResult = {
  user: SafeUser;
  organization: Organization;
};

export type OrganizationWithRole = Organization & {
  role: OrganizationRole;
};

export type OrganizationMemberWithUser = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
  user: SafeUser;
};
