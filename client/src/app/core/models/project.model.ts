import type { OrganizationRole } from './organization.model';

export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProjectOwnerSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type ProjectSummary = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  startDate: string | null;
  dueDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: ProjectOwnerSummary;
};

export type ProjectsResponseData = {
  projects: ProjectSummary[];
};

export type ProjectResponseData = {
  project: ProjectSummary;
};

export type EditableProjectStatus = Exclude<ProjectStatus, 'ARCHIVED'>;

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: EditableProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  dueDate?: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    platformRole: 'USER' | 'SUPERADMIN';
    avatarUrl: string | null;
    themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
    createdAt: string;
    updatedAt: string;
  };
};

export type ProjectMembersResponseData = {
  members: ProjectMember[];
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  status?: EditableProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
};
