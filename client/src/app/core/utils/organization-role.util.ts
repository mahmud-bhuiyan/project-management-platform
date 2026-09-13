import type { OrganizationRole } from '../models/organization.model';

const MANAGER_ROLES = new Set<OrganizationRole>(['OWNER', 'ADMIN']);

export function canManageOrganizationMembers(role: OrganizationRole): boolean {
  return MANAGER_ROLES.has(role);
}

export function canModifyMember(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  if (actorRole === 'OWNER') {
    return true;
  }

  if (actorRole === 'ADMIN') {
    return targetRole !== 'OWNER';
  }

  return false;
}

export function canAssignOrganizationRole(
  actorRole: OrganizationRole,
  nextRole: OrganizationRole,
): boolean {
  if (nextRole === 'OWNER') {
    return actorRole === 'OWNER';
  }

  return canManageOrganizationMembers(actorRole);
}

export function organizationRoleLabel(role: OrganizationRole): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'ADMIN':
      return 'Admin';
    case 'MEMBER':
      return 'Member';
    case 'VIEWER':
      return 'Viewer';
  }
}
