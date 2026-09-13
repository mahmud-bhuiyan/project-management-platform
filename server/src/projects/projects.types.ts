import type {
  OrganizationRole,
  Project,
  ProjectPriority,
  ProjectStatus,
} from '@prisma/client';
import type { SafeUser } from '../users/users.types.js';

export type ProjectOwnerSummary = Pick<SafeUser, 'id' | 'name' | 'email' | 'avatarUrl'>;

export type ProjectResponse = Project & {
  owner: ProjectOwnerSummary;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  ownerId?: string;
  startDate?: Date;
  dueDate?: Date;
};

export type ProjectMemberWithUser = {
  id: string;
  projectId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
  user: SafeUser;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  ownerId?: string;
  startDate?: Date | null;
  dueDate?: Date | null;
};
