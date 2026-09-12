import { HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { hashPassword } from '../common/utils/password.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateUserInput } from '../users/users.types.js';
import type { CompanyAdminResult } from './organizations.types.js';

export type CreateCompanyAdminInput = CreateUserInput & {
  organizationName: string;
  organizationSlug: string;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createCompanyAdmin(
    input: CreateCompanyAdminInput,
  ): Promise<CompanyAdminResult> {
    const email = input.email.toLowerCase();
    const slug = input.organizationSlug.toLowerCase();

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ApiException(
        'Email is already registered',
        'EMAIL_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const existingOrganization = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingOrganization) {
      throw new ApiException(
        'Organization slug is already taken',
        'ORGANIZATION_SLUG_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: input.name,
          passwordHash,
          avatarUrl: input.avatarUrl,
          themePreference: input.themePreference,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: OrganizationRole.OWNER,
        },
      });

      return { user, organization };
    });

    return {
      user: this.usersService.toSafeUser(result.user),
      organization: result.organization,
    };
  }
}
