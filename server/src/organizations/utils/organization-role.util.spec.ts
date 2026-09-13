import { OrganizationRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  canAssignOrganizationRole,
  canManageOrganizationMembers,
  canModifyMember,
} from './organization-role.util.js';

describe('organization-role.util', () => {
  it('canManageOrganizationMembers allows owner and admin only', () => {
    expect(canManageOrganizationMembers(OrganizationRole.OWNER)).toBe(true);
    expect(canManageOrganizationMembers(OrganizationRole.ADMIN)).toBe(true);
    expect(canManageOrganizationMembers(OrganizationRole.MEMBER)).toBe(false);
    expect(canManageOrganizationMembers(OrganizationRole.VIEWER)).toBe(false);
  });

  it('canModifyMember blocks admins from managing owners', () => {
    expect(
      canModifyMember(OrganizationRole.ADMIN, OrganizationRole.OWNER),
    ).toBe(false);
    expect(
      canModifyMember(OrganizationRole.ADMIN, OrganizationRole.MEMBER),
    ).toBe(true);
    expect(
      canModifyMember(OrganizationRole.OWNER, OrganizationRole.ADMIN),
    ).toBe(true);
  });

  it('canAssignOrganizationRole allows only owners to assign owner', () => {
    expect(
      canAssignOrganizationRole(OrganizationRole.OWNER, OrganizationRole.OWNER),
    ).toBe(true);
    expect(
      canAssignOrganizationRole(OrganizationRole.ADMIN, OrganizationRole.OWNER),
    ).toBe(false);
    expect(
      canAssignOrganizationRole(OrganizationRole.ADMIN, OrganizationRole.MEMBER),
    ).toBe(true);
  });
});
