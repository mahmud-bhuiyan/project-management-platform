import {
  Body,
  Controller,
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
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationRoleGuard } from './guards/organization-role.guard.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({
    description: 'Organization created successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization created successfully',
        data: {
          organization: {
            id: 'uuid',
            name: 'Acme Technologies',
            slug: 'acme-technologies',
            role: 'OWNER',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiConflictResponse({ description: 'Organization slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrganizationDto,
  ) {
    const organization = await this.organizationsService.create(req.user!.id, dto);
    return respond.created(
      { organization },
      'Organization created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: "List the current user's organizations" })
  @ApiOkResponse({
    description: 'Organizations retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Organizations retrieved successfully',
        data: {
          organizations: [
            {
              id: 'uuid',
              name: 'Acme Technologies',
              slug: 'acme-technologies',
              role: 'OWNER',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findAll(@Req() req: AuthenticatedRequest) {
    const organizations = await this.organizationsService.findAllForUser(
      req.user!.id,
    );
    return respond.ok(
      { organizations },
      'Organizations retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiOkResponse({
    description: 'Organization retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization retrieved successfully',
        data: {
          organization: {
            id: 'uuid',
            name: 'Acme Technologies',
            slug: 'acme-technologies',
            role: 'OWNER',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const organization = await this.organizationsService.findOneForUser(
      req.user!.id,
      id,
    );
    return respond.ok(
      { organization },
      'Organization retrieved successfully',
    );
  }

  @Patch(':id')
  @UseGuards(OrganizationRoleGuard)
  @RequireOrganizationManager()
  @ApiOperation({ summary: 'Update an organization name' })
  @ApiOkResponse({
    description: 'Organization updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Organization updated successfully',
        data: {
          organization: {
            id: 'uuid',
            name: 'Acme Corp',
            slug: 'acme-technologies',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiForbiddenResponse({ description: 'Insufficient organization permissions' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const organization = await this.organizationsService.update(
      req.user!.id,
      id,
      dto,
    );
    return respond.updated(
      { organization },
      'Organization updated successfully',
    );
  }
}
