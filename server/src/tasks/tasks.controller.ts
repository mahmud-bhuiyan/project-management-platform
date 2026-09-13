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
  Query,
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
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import { ReorderTasksDto } from './dto/reorder-tasks.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task in a project' })
  @ApiCreatedResponse({ description: 'Task created successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(
      req.user!.id,
      organizationId,
      projectId,
      {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
      },
    );

    return respond.created({ task }, 'Task created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List tasks for a project' })
  @ApiOkResponse({ description: 'Tasks retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksQueryDto,
  ) {
    const result = await this.tasksService.findAllForProject(
      req.user!.id,
      organizationId,
      projectId,
      {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        status: query.status,
        priority: query.priority,
        assigneeId: query.assigneeId,
        search: query.search,
      },
    );

    return {
      data: { tasks: result.tasks },
      meta: {
        page: result.page,
        perPage: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder tasks on the Kanban board',
    description:
      'Update task status and position. Send one item to move a single task with automatic column shifting; send multiple items to set final positions in batch.',
  })
  @ApiOkResponse({ description: 'Tasks reordered successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async reorder(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    const result = await this.tasksService.reorder(
      req.user!.id,
      organizationId,
      projectId,
      dto.items.map((item) => ({
        taskId: item.taskId,
        status: item.status,
        position: item.position,
      })),
    );

    return respond.updated({ tasks: result.tasks }, 'Tasks reordered successfully');
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiOkResponse({ description: 'Task retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    const task = await this.tasksService.findOneForProject(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
    );

    return respond.ok({ task }, 'Task retrieved successfully');
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiOkResponse({ description: 'Task updated successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
      },
    );

    return respond.updated({ task }, 'Task updated successfully');
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiOkResponse({ description: 'Task deleted successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Task, project, or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    await this.tasksService.remove(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
    );

    return respond.deleted('Task deleted successfully');
  }
}
