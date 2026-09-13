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
import { RequireOrganizationManager } from './decorators/require-organization-roles.decorator.js';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto.js';
import { OrganizationRoleGuard } from './guards/organization-role.guard.js';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organization members' })
  @ApiOkResponse({
    description: 'Organization members retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization members retrieved successfully',
        data: {
          members: [
            {
              id: 'uuid',
              organizationId: 'uuid',
              userId: 'uuid',
              role: 'OWNER',
              createdAt: '2026-01-01T00:00:00.000Z',
              user: {
                id: 'uuid',
                email: 'admin@acme.dev',
                name: 'Acme Admin',
                platformRole: 'USER',
                avatarUrl: null,
                themePreference: 'LIGHT',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async listMembers(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const members = await this.organizationsService.listMembers(
      req.user!.id,
      organizationId,
    );
    return respond.ok(
      { members },
      'Organization members retrieved successfully',
    );
  }

  @Post()
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an existing user to the organization by email' })
  @ApiCreatedResponse({
    description: 'Organization member added successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization member added successfully',
        data: {
          member: {
            id: 'uuid',
            organizationId: 'uuid',
            userId: 'uuid',
            role: 'MEMBER',
            createdAt: '2026-01-01T00:00:00.000Z',
            user: {
              id: 'uuid',
              email: 'member@acme.dev',
              name: 'Team Member',
              platformRole: 'USER',
              avatarUrl: null,
              themePreference: 'LIGHT',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Caller cannot manage organization members',
  })
  @ApiNotFoundResponse({ description: 'Organization or user not found' })
  @ApiConflictResponse({ description: 'User is already a member' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async addMember(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    const member = await this.organizationsService.addMember(
      req.user!.id,
      organizationId,
      dto,
    );
    return respond.created(
      { member },
      'Organization member added successfully',
    );
  }

  @Patch(':memberId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Update an organization member role' })
  @ApiOkResponse({
    description: 'Organization member role updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization member role updated successfully',
        data: {
          member: {
            id: 'uuid',
            organizationId: 'uuid',
            userId: 'uuid',
            role: 'ADMIN',
            createdAt: '2026-01-01T00:00:00.000Z',
            user: {
              id: 'uuid',
              email: 'member@acme.dev',
              name: 'Team Member',
              platformRole: 'USER',
              avatarUrl: null,
              themePreference: 'LIGHT',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Caller cannot manage organization members',
  })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({ description: 'Cannot remove the last owner' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async updateMemberRole(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateOrganizationMemberRoleDto,
  ) {
    const member = await this.organizationsService.updateMemberRole(
      req.user!.id,
      organizationId,
      memberId,
      dto,
    );
    return respond.updated(
      { member },
      'Organization member role updated successfully',
    );
  }

  @Delete(':memberId')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiOkResponse({
    description: 'Organization member removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization member removed successfully',
        data: null,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Caller cannot manage organization members',
  })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({ description: 'Cannot remove the last owner' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    await this.organizationsService.removeMember(
      req.user!.id,
      organizationId,
      memberId,
    );
    return respond.deleted('Organization member removed successfully');
  }
}
