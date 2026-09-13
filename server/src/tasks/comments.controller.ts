import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(
  'organizations/:organizationId/projects/:projectId/tasks/:taskId/comments',
)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiCreatedResponse({ description: 'Comment created successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.create(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      { body: dto.body },
    );

    return respond.created({ comment }, 'Comment created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List comments for a task' })
  @ApiOkResponse({ description: 'Comments retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    const comments = await this.commentsService.findAllForTask(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
    );

    return respond.ok({ comments }, 'Comments retrieved successfully');
  }

  @Get(':commentId')
  @ApiOperation({ summary: 'Get a comment by id' })
  @ApiOkResponse({ description: 'Comment retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({
    description: 'Comment, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    const comment = await this.commentsService.findOneForTask(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      commentId,
    );

    return respond.ok({ comment }, 'Comment retrieved successfully');
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit your own comment' })
  @ApiOkResponse({ description: 'Comment updated successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions or not the comment author',
  })
  @ApiNotFoundResponse({
    description: 'Comment, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.update(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      commentId,
      { body: dto.body },
    );

    return respond.updated({ comment }, 'Comment updated successfully');
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete your own comment' })
  @ApiOkResponse({ description: 'Comment deleted successfully' })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions or not the comment author',
  })
  @ApiNotFoundResponse({
    description: 'Comment, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    await this.commentsService.remove(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      commentId,
    );

    return respond.deleted('Comment deleted successfully');
  }
}
