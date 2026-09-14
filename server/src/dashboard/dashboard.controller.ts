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
import { respond } from '../common/utils/api-response.util.js';
import { DashboardService } from './dashboard.service.js';
import { GetDashboardStatsQueryDto } from './dto/get-dashboard-stats-query.dto.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard summary stats for an organization' })
  @ApiOkResponse({
    description: 'Dashboard stats retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: {
          stats: {
            totalProjects: 0,
            activeProjects: 0,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            charts: {
              tasksByStatus: [],
              tasksByPriority: [],
              projectProgress: [],
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiForbiddenResponse({ description: 'User is not a member of the organization' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async getStats(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetDashboardStatsQueryDto,
  ) {
    const stats = await this.dashboardService.getStats(
      req.user!.id,
      query.organizationId,
    );

    return respond.ok({ stats }, 'Dashboard stats retrieved successfully');
  }
}
