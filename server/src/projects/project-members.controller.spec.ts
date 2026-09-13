import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectMembersService } from './project-members.service.js';

const member = {
  id: 'pm-2',
  projectId: 'project-1',
  userId: 'user-2',
  role: OrganizationRole.MEMBER,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  user: {
    id: 'user-2',
    email: 'member@acme.dev',
    name: 'Team Member',
    platformRole: 'USER' as const,
    avatarUrl: null,
    themePreference: 'LIGHT' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

describe('ProjectMembersController', () => {
  let controller: ProjectMembersController;

  const projectMembersService = {
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  };

  const organizationsService = {
    getMembershipForUser: vi.fn(),
  };

  const createAuthenticatedRequest = () =>
    ({
      user: {
        id: 'user-1',
        email: 'admin@acme.com',
        platformRole: 'USER',
      },
    }) as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    projectMembersService.listMembers.mockResolvedValue([member]);
    projectMembersService.addMember.mockResolvedValue(member);
    projectMembersService.removeMember.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectMembersController],
      providers: [
        { provide: ProjectMembersService, useValue: projectMembersService },
        { provide: OrganizationsService, useValue: organizationsService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
        OrganizationRoleGuard,
      ],
    }).compile();

    controller = module.get(ProjectMembersController);
  });

  it('listMembers returns project members', async () => {
    const result = await controller.listMembers(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
    );

    expect(projectMembersService.listMembers).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
    );
    expect(result.data.members).toHaveLength(1);
  });

  it('addMember returns created project member', async () => {
    const result = await controller.addMember(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      { email: 'member@acme.dev' },
    );

    expect(projectMembersService.addMember).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      { email: 'member@acme.dev' },
    );
    expect(result.data.member.user.email).toBe('member@acme.dev');
  });

  it('removeMember returns deleted response', async () => {
    const result = await controller.removeMember(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'pm-2',
    );

    expect(projectMembersService.removeMember).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'pm-2',
    );
    expect(result.message).toBe('Project member removed successfully');
  });
});
