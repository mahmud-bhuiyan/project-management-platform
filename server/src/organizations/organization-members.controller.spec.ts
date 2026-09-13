import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { OrganizationMembersController } from './organization-members.controller.js';
import { OrganizationsService } from './organizations.service.js';

const member = {
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-2',
  role: OrganizationRole.MEMBER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
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

describe('OrganizationMembersController', () => {
  let controller: OrganizationMembersController;

  const organizationsService = {
    listMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  };

  const createAuthenticatedRequest = () =>
    ({
      user: {
        id: 'user-1',
        email: 'admin@acme.dev',
        platformRole: 'USER',
      },
    }) as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationMembersController],
      providers: [
        { provide: OrganizationsService, useValue: organizationsService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(OrganizationMembersController);
  });

  it('listMembers returns members', async () => {
    organizationsService.listMembers.mockResolvedValue([member]);

    const result = await controller.listMembers(
      createAuthenticatedRequest(),
      'org-1',
    );

    expect(organizationsService.listMembers).toHaveBeenCalledWith(
      'user-1',
      'org-1',
    );
    expect(result.data.members).toHaveLength(1);
  });

  it('addMember creates a member', async () => {
    organizationsService.addMember.mockResolvedValue(member);

    const result = await controller.addMember(
      createAuthenticatedRequest(),
      'org-1',
      { email: 'member@acme.dev' },
    );

    expect(organizationsService.addMember).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      { email: 'member@acme.dev' },
    );
    expect(result.data.member.email).toBeUndefined();
    expect(result.data.member.user.email).toBe('member@acme.dev');
  });

  it('updateMemberRole updates role', async () => {
    organizationsService.updateMemberRole.mockResolvedValue({
      ...member,
      role: OrganizationRole.ADMIN,
    });

    const result = await controller.updateMemberRole(
      createAuthenticatedRequest(),
      'org-1',
      'member-1',
      { role: OrganizationRole.ADMIN },
    );

    expect(organizationsService.updateMemberRole).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'member-1',
      { role: OrganizationRole.ADMIN },
    );
    expect(result.data.member.role).toBe(OrganizationRole.ADMIN);
  });

  it('removeMember deletes a member', async () => {
    organizationsService.removeMember.mockResolvedValue(undefined);

    const result = await controller.removeMember(
      createAuthenticatedRequest(),
      'org-1',
      'member-1',
    );

    expect(organizationsService.removeMember).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'member-1',
    );
    expect(result.data).toBeNull();
  });
});
