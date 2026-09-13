import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { respond } from '../common/utils/api-response.util.js';
import { ActivityLogService } from './activity-log.service.js';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(
  'organizations/:organizationId/projects/:projectId/tasks/:taskId/activity',
)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'List activity for a task' })
  @ApiOkResponse({ description: 'Activity retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    const activity = await this.activityLogService.findAllForTask(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
    );

    return respond.ok({ activity }, 'Activity retrieved successfully');
  }
}
