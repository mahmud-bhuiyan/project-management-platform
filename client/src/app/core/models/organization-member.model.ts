import type { OrganizationRole } from './organization.model';
import type { User } from './user.model';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user: User;
}

export interface OrganizationMembersResponseData {
  members: OrganizationMember[];
}

export interface OrganizationMemberResponseData {
  member: OrganizationMember;
}
