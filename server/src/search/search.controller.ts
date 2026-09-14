import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto.js';
import { SearchService } from './search.service.js';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global search across tasks, projects, and organization members',
  })
  @ApiOkResponse({
    description: 'Search results retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          results: [
            {
              type: 'task',
              id: 'uuid',
              title: 'Login API',
              projectId: 'uuid',
              projectName: 'Website Redesign',
              status: 'IN_PROGRESS',
            },
            {
              type: 'project',
              id: 'uuid',
              name: 'Website Redesign',
              status: 'ACTIVE',
            },
            {
              type: 'user',
              id: 'uuid',
              name: 'Alex Rivera',
              email: 'alex@acme.dev',
            },
          ],
        },
        meta: {
          page: 1,
          perPage: 20,
          total: 3,
          totalPages: 1,
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiForbiddenResponse({ description: 'User is not a member of the organization' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async search(
    @Req() req: AuthenticatedRequest,
    @Query() query: GlobalSearchQueryDto,
  ) {
    const result = await this.searchService.search(req.user!.id, query.organizationId, {
      q: query.q,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      type: query.type,
    });

    return {
      data: { results: result.results },
      meta: {
        page: result.page,
        perPage: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
