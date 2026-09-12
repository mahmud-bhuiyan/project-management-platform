import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { respond } from '../common/utils/api-response.util.js';
import { AuthService } from './auth.service.js';
import { CreateCompanyAdminDto } from './dto/create-company-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('company-admins')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a company admin and organization (superadmin only)',
  })
  @ApiHeader({
    name: 'x-superadmin-key',
    description:
      'Bootstrap key for superadmin access until JWT login is available',
    required: false,
  })
  @ApiCreatedResponse({
    description: 'Company admin and organization created successfully',
    schema: {
      example: {
        success: true,
        message: 'Company admin created successfully',
        data: {
          user: {
            id: 'uuid',
            email: 'admin@acme.com',
            name: 'Acme Admin',
            platformRole: 'USER',
            avatarUrl: null,
            themePreference: 'LIGHT',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          organization: {
            id: 'uuid',
            name: 'Acme Technologies',
            slug: 'acme-technologies',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Caller is not a superadmin',
    schema: {
      example: {
        success: false,
        message: 'Superadmin access required',
        error: { code: 'FORBIDDEN', details: null },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email or organization slug already exists',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed',
  })
  async createCompanyAdmin(@Body() dto: CreateCompanyAdminDto) {
    const result = await this.authService.createCompanyAdmin(dto);
    return respond.created(result, 'Company admin created successfully');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'jwt-access-token',
          user: {
            id: 'uuid',
            email: 'admin@acme.com',
            name: 'Acme Admin',
            platformRole: 'USER',
            avatarUrl: null,
            themePreference: 'LIGHT',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        message: 'Invalid email or password',
        error: { code: 'INVALID_CREDENTIALS', details: null },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed',
  })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return respond.ok(result, 'Login successful');
  }
}
