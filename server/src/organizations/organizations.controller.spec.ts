import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';

const organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme-technologies',
  role: 'OWNER' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('OrganizationsController', () => {
  let organizationsController: OrganizationsController;

  const organizationsService = {
    create: vi.fn(),
    findAllForUser: vi.fn(),
    findOneForUser: vi.fn(),
    update: vi.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
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

    organizationsController = module.get(OrganizationsController);
  });

  it('create returns created organization', async () => {
    organizationsService.create.mockResolvedValue(organization);

    const result = await organizationsController.create(
      createAuthenticatedRequest(),
      { name: 'Acme Technologies' },
    );

    expect(organizationsService.create).toHaveBeenCalledWith('user-1', {
      name: 'Acme Technologies',
    });
    expect(result.data.organization.slug).toBe('acme-technologies');
    expect(result.message).toBe('Organization created successfully');
  });

  it('findAll returns organizations for current user', async () => {
    organizationsService.findAllForUser.mockResolvedValue([organization]);

    const result = await organizationsController.findAll(
      createAuthenticatedRequest(),
    );

    expect(organizationsService.findAllForUser).toHaveBeenCalledWith('user-1');
    expect(result.data.organizations).toHaveLength(1);
  });

  it('findOne returns organization by id', async () => {
    organizationsService.findOneForUser.mockResolvedValue(organization);

    const result = await organizationsController.findOne(
      createAuthenticatedRequest(),
      organization.id,
    );

    expect(organizationsService.findOneForUser).toHaveBeenCalledWith(
      'user-1',
      organization.id,
    );
    expect(result.data.organization.id).toBe(organization.id);
  });

  it('update returns updated organization', async () => {
    organizationsService.update.mockResolvedValue({
      ...organization,
      name: 'Acme Corp',
    });

    const result = await organizationsController.update(
      createAuthenticatedRequest(),
      organization.id,
      { name: 'Acme Corp' },
    );

    expect(organizationsService.update).toHaveBeenCalledWith(
      'user-1',
      organization.id,
      { name: 'Acme Corp' },
    );
    expect(result.data.organization.name).toBe('Acme Corp');
  });
});
