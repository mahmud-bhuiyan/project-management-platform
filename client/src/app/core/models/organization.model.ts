export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationsResponseData {
  organizations: Organization[];
}
