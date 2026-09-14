import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { GlobalSearchResultType } from './search.types.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

describe('SearchController', () => {
  let searchController: SearchController;

  const searchService = {
    search: vi.fn(),
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
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: searchService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
      ],
    }).compile();

    searchController = module.get(SearchController);
  });

  it('returns paginated search results', async () => {
    searchService.search.mockResolvedValue({
      results: [
        {
          type: GlobalSearchResultType.TASK,
          id: 'task-1',
          title: 'Login API',
          projectId: 'project-1',
          projectName: 'Website Redesign',
          status: 'IN_PROGRESS',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const result = await searchController.search(createAuthenticatedRequest(), {
      organizationId: 'org-1',
      q: 'login',
      page: 1,
      limit: 20,
    });

    expect(searchService.search).toHaveBeenCalledWith('user-1', 'org-1', {
      q: 'login',
      page: 1,
      limit: 20,
      type: undefined,
    });
    expect(result.data.results).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
