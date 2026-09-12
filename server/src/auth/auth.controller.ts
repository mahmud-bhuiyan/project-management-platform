import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { respond } from '../common/utils/api-response.util.js';
import {
  REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './auth-cookie.util.js';
import { AuthService } from './auth.service.js';
import { CreateCompanyAdminDto } from './dto/create-company-admin.dto.js';
import { DemoLoginDto } from './dto/demo-login.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('company-admins')
  @UseGuards(OptionalJwtAuthGuard, SuperAdminGuard)
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

  @Get('demo-personas')
  @ApiOperation({ summary: 'List demo login personas (email only)' })
  @ApiOkResponse({
    description: 'Demo personas available for quick login',
    schema: {
      example: {
        success: true,
        message: 'Demo personas retrieved successfully',
        data: {
          personas: [
            { label: 'Superadmin', email: 'superadmin@flowdesk.local' },
            { label: 'Company Admin', email: 'admin@acme.dev' },
          ],
        },
      },
    },
  })
  getDemoPersonas() {
    const personas = this.authService.getDemoPersonas();
    return respond.ok({ personas }, 'Demo personas retrieved successfully');
  }

  @Post('demo-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login as a demo persona using server-side credentials',
  })
  @ApiOkResponse({
    description: 'Demo login successful',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'jwt-access-token',
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
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid demo persona',
  })
  @ApiForbiddenResponse({
    description: 'Demo login is disabled',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed',
  })
  async demoLogin(
    @Body() dto: DemoLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.demoLogin(dto);
    setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken: _refreshToken, ...data } = result;
    return respond.ok(data, 'Login successful');
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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken: _refreshToken, ...data } = result;
    return respond.ok(data, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using httpOnly refresh cookie',
  })
  @ApiOkResponse({
    description: 'Access token refreshed successfully',
    schema: {
      example: {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: 'jwt-access-token',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired refresh token',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired refresh token',
        error: { code: 'UNAUTHORIZED', details: null },
      },
    },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    setRefreshTokenCookie(res, result.refreshToken);

    return respond.ok(
      { accessToken: result.accessToken },
      'Token refreshed successfully',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiOkResponse({
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully',
        data: null,
      },
    },
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    clearRefreshTokenCookie(res);

    return respond.ok(null, 'Logged out successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({
    description: 'Current user profile',
    schema: {
      example: {
        success: true,
        message: 'Profile retrieved successfully',
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
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
    schema: {
      example: {
        success: false,
        message: 'Access token required',
        error: { code: 'UNAUTHORIZED', details: null },
      },
    },
  })
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getMe(req.user!.id);
    return respond.ok({ user }, 'Profile retrieved successfully');
  }
}
