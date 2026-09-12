import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/exceptions/api.exception.js';
import { comparePassword } from '../common/utils/password.util.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import type { CompanyAdminResult } from '../organizations/organizations.types.js';
import { UsersService } from '../users/users.service.js';
import type { SafeUser } from '../users/users.types.js';
import type { AccessTokenPayload, LoginResult } from './auth.types.js';
import type { CreateCompanyAdminDto } from './dto/create-company-admin.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  createCompanyAdmin(dto: CreateCompanyAdminDto): Promise<CompanyAdminResult> {
    return this.organizationsService.createCompanyAdmin(dto);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
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

    return {
      accessToken,
      user: safeUser,
    };
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
