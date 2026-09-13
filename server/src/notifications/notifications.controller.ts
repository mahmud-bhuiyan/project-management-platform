import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ description: 'Notifications retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const result = await this.notificationsService.findAllForUser(
      req.user!.id,
      {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        unreadOnly: query.unreadOnly,
      },
    );

    return {
      data: { notifications: result.notifications },
      meta: {
        page: result.page,
        perPage: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiOkResponse({ description: 'Unread count retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const unreadCount = await this.notificationsService.getUnreadCount(
      req.user!.id,
    );

    return respond.ok({ unreadCount }, 'Unread count retrieved successfully');
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiOkResponse({ description: 'Notifications marked as read successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const updatedCount = await this.notificationsService.markAllAsRead(
      req.user!.id,
    );

    return respond.updated(
      { updatedCount },
      'Notifications marked as read successfully',
    );
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ description: 'Notification marked as read successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    const notification = await this.notificationsService.markAsRead(
      req.user!.id,
      notificationId,
    );

    return respond.updated(
      { notification },
      'Notification marked as read successfully',
    );
  }
}
