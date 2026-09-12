import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import {
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from './auth-cookie.util.js';
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
}
