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
import { RequireOrganizationManager } from '../organizations/decorators/require-organization-roles.decorator.js';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Create a project in an organization' })
  @ApiCreatedResponse({ description: 'Project created successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(
      req.user!.id,
      organizationId,
      {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        ownerId: dto.ownerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    );

    return respond.created({ project }, 'Project created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List projects for an organization' })
  @ApiOkResponse({ description: 'Projects retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ListProjectsQueryDto,
  ) {
    const projects = await this.projectsService.findAllForOrganization(
      req.user!.id,
      organizationId,
      query.includeArchived ?? false,
    );

    return respond.ok({ projects }, 'Projects retrieved successfully');
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiOkResponse({ description: 'Project retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const project = await this.projectsService.findOneForOrganization(
      req.user!.id,
      organizationId,
      projectId,
    );

    return respond.ok({ project }, 'Project retrieved successfully');
  }

  @Patch(':projectId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ description: 'Project updated successfully' })
  @ApiConflictResponse({ description: 'Project is archived' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(
      req.user!.id,
      organizationId,
      projectId,
      {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        ownerId: dto.ownerId,
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate === null
              ? null
              : new Date(dto.startDate),
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
      },
    );

    return respond.updated({ project }, 'Project updated successfully');
  }

  @Post(':projectId/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Archive a project' })
  @ApiOkResponse({ description: 'Project archived successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async archive(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const project = await this.projectsService.archive(
      req.user!.id,
      organizationId,
      projectId,
    );

    return respond.updated({ project }, 'Project archived successfully');
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Delete a project' })
  @ApiOkResponse({ description: 'Project deleted successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.projectsService.remove(req.user!.id, organizationId, projectId);
    return respond.deleted('Project deleted successfully');
  }
}
