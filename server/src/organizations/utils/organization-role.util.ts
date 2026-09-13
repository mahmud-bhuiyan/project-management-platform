import { OrganizationRole } from '@prisma/client';

const MANAGER_ROLES = new Set<OrganizationRole>([
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
]);

export function canManageOrganizationMembers(role: OrganizationRole): boolean {
  return MANAGER_ROLES.has(role);
}

export function canModifyMember(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  if (actorRole === OrganizationRole.OWNER) {
    return true;
  }

  if (actorRole === OrganizationRole.ADMIN) {
    return targetRole !== OrganizationRole.OWNER;
  }

  return false;
}

export function canAssignOrganizationRole(
  actorRole: OrganizationRole,
  nextRole: OrganizationRole,
): boolean {
  if (nextRole === OrganizationRole.OWNER) {
    return actorRole === OrganizationRole.OWNER;
  }

  return canManageOrganizationMembers(actorRole);
}
