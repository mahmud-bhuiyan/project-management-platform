import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { RequireOrganizationManager } from '../organizations/decorators/require-organization-roles.decorator.js';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { ProjectMembersService } from './project-members.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/projects/:projectId/members')
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  @Get()
  @ApiOperation({ summary: 'List project members' })
  @ApiOkResponse({ description: 'Project members retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient project permissions' })
  @ApiNotFoundResponse({ description: 'Project or organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async listMembers(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const members = await this.projectMembersService.listMembers(
      req.user!.id,
      organizationId,
      projectId,
    );

    return respond.ok({ members }, 'Project members retrieved successfully');
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an organization member to a project by email' })
  @ApiCreatedResponse({ description: 'Project member added successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Project, organization, or user not found' })
  @ApiConflictResponse({ description: 'User is already a project member' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async addMember(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    const member = await this.projectMembersService.addMember(
      req.user!.id,
      organizationId,
      projectId,
      dto,
    );

    return respond.created({ member }, 'Project member added successfully');
  }

  @Delete(':memberId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiOkResponse({ description: 'Project member removed successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiNotFoundResponse({ description: 'Project, organization, or member not found' })
  @ApiConflictResponse({ description: 'Cannot remove the project owner' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    await this.projectMembersService.removeMember(
      req.user!.id,
      organizationId,
      projectId,
      memberId,
    );

    return respond.deleted('Project member removed successfully');
  }
}
