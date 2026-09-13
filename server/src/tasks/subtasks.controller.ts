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
import { CreateSubtaskDto } from './dto/create-subtask.dto.js';
import { UpdateSubtaskDto } from './dto/update-subtask.dto.js';
import { SubtasksService } from './subtasks.service.js';

@ApiTags('subtasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(
  'organizations/:organizationId/projects/:projectId/tasks/:taskId/subtasks',
)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subtask on a task' })
  @ApiCreatedResponse({ description: 'Subtask created successfully' })
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
    @Body() dto: CreateSubtaskDto,
  ) {
    const subtask = await this.subtasksService.create(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      {
        title: dto.title,
        position: dto.position,
      },
    );

    return respond.created({ subtask }, 'Subtask created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List subtasks for a task' })
  @ApiOkResponse({ description: 'Subtasks retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    const subtasks = await this.subtasksService.findAllForTask(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
    );

    return respond.ok({ subtasks }, 'Subtasks retrieved successfully');
  }

  @Get(':subtaskId')
  @ApiOperation({ summary: 'Get a subtask by id' })
  @ApiOkResponse({ description: 'Subtask retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({
    description: 'Subtask, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
  ) {
    const subtask = await this.subtasksService.findOneForTask(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      subtaskId,
    );

    return respond.ok({ subtask }, 'Subtask retrieved successfully');
  }

  @Patch(':subtaskId')
  @ApiOperation({ summary: 'Update a subtask (title, completion, position)' })
  @ApiOkResponse({ description: 'Subtask updated successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({
    description: 'Subtask, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    const subtask = await this.subtasksService.update(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      subtaskId,
      {
        title: dto.title,
        completed: dto.completed,
        position: dto.position,
      },
    );

    return respond.updated({ subtask }, 'Subtask updated successfully');
  }

  @Delete(':subtaskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subtask' })
  @ApiOkResponse({ description: 'Subtask deleted successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({
    description: 'Subtask, task, project, or organization not found',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
  ) {
    await this.subtasksService.remove(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      subtaskId,
    );

    return respond.deleted('Subtask deleted successfully');
  }
}
