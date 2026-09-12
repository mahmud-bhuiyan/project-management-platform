import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/exceptions/api.exception.js';
import { comparePassword } from '../common/utils/password.util.js';
import {
  generateRefreshToken,
  hashRefreshToken,
} from '../common/utils/token.util.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import type { CompanyAdminResult } from '../organizations/organizations.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { SafeUser } from '../users/users.types.js';
import type {
  AccessTokenPayload,
  LoginWithRefreshTokenResult,
  RefreshResult,
} from './auth.types.js';
import type { CreateCompanyAdminDto } from './dto/create-company-admin.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  createCompanyAdmin(dto: CreateCompanyAdminDto): Promise<CompanyAdminResult> {
    return this.organizationsService.createCompanyAdmin(dto);
  }

  async login(dto: LoginDto): Promise<LoginWithRefreshTokenResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new ApiException(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatches = await comparePassword(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new ApiException(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const safeUser = this.usersService.toSafeUser(user);
    const accessToken = await this.createAccessToken(safeUser);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      user: safeUser,
      refreshToken,
    };
  }

  async refresh(rawToken: string | undefined): Promise<RefreshResult> {
    if (!rawToken) {
      throw new ApiException(
        'Refresh token required',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenHash = hashRefreshToken(rawToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }

      throw new ApiException(
        'Invalid or expired refresh token',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const safeUser = this.usersService.toSafeUser(storedToken.user);

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const accessToken = await this.createAccessToken(safeUser);
    const refreshToken = await this.issueRefreshToken(storedToken.userId);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private createAccessToken(user: SafeUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
    };

    return this.jwtService.signAsync(payload);
  }
}
