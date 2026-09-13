import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OrganizationRole,
  type Organization,
  type User,
} from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { hashPassword } from '../common/utils/password.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateUserInput } from '../users/users.types.js';
import type {
  CompanyAdminResult,
  OrganizationMemberWithUser,
  OrganizationWithRole,
} from './organizations.types.js';
import {
  canAssignOrganizationRole,
  canManageOrganizationMembers,
  canModifyMember,
} from './utils/organization-role.util.js';
import {
  appendSlugSuffix,
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from './utils/organization-slug.util.js';

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

  async create(
    userId: string,
    input: { name: string; slug?: string },
  ): Promise<OrganizationWithRole> {
    const slug = input.slug
      ? input.slug.toLowerCase()
      : await this.generateUniqueSlug(input.name);

    if (!isValidOrganizationSlug(slug)) {
      throw new ApiException(
        'Organization slug is invalid',
        'INVALID_ORGANIZATION_SLUG',
        HttpStatus.UNPROCESSABLE_ENTITY,
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

    const organization = await this.prisma.$transaction(async (tx) => {
      const createdOrganization = await tx.organization.create({
        data: {
          name: input.name,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: createdOrganization.id,
          userId,
          role: OrganizationRole.OWNER,
        },
      });

      return createdOrganization;
    });

    return {
      ...organization,
      role: OrganizationRole.OWNER,
    };
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organization: { name: 'asc' } },
    });

    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    }));
  }

  async findOneForUser(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationWithRole> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      throw new ApiException(
        'Organization not found',
        'ORGANIZATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      ...membership.organization,
      role: membership.role,
    };
  }

  async getMembershipForUser(
    userId: string,
    organizationId: string,
  ): Promise<{ organizationId: string; role: OrganizationRole }> {
    const membership = await this.getMembership(userId, organizationId);
    return {
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  async update(
    userId: string,
    organizationId: string,
    input: { name: string },
  ): Promise<Organization> {
    const actorMembership = await this.getMembership(userId, organizationId);
    this.assertCanManageMembers(actorMembership.role);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { name: input.name },
    });
  }

  async listMembers(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMemberWithUser[]> {
    await this.findOneForUser(userId, organizationId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: [{ createdAt: 'asc' }],
    });

    return members.map((member) => this.toOrganizationMemberWithUser(member));
  }

  async addMember(
    actorUserId: string,
    organizationId: string,
    input: { email: string; role?: OrganizationRole },
  ): Promise<OrganizationMemberWithUser> {
    const actorMembership = await this.getMembership(actorUserId, organizationId);
    this.assertCanManageMembers(actorMembership.role);

    const role = input.role ?? OrganizationRole.MEMBER;
    if (!canAssignOrganizationRole(actorMembership.role, role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new ApiException(
        'User not found',
        'USER_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });
    if (existingMembership) {
      throw new ApiException(
        'User is already a member of this organization',
        'MEMBER_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role,
      },
      include: { user: true },
    });

    return this.toOrganizationMemberWithUser(member);
  }

  async updateMemberRole(
    actorUserId: string,
    organizationId: string,
    memberId: string,
    input: { role: OrganizationRole },
  ): Promise<OrganizationMemberWithUser> {
    const actorMembership = await this.getMembership(actorUserId, organizationId);
    this.assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMemberById(organizationId, memberId);

    if (!canModifyMember(actorMembership.role, targetMembership.role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!canAssignOrganizationRole(actorMembership.role, input.role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      targetMembership.role === OrganizationRole.OWNER &&
      input.role !== OrganizationRole.OWNER
    ) {
      await this.assertOrganizationHasAnotherOwner(organizationId, memberId);
    }

    const member = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: input.role },
      include: { user: true },
    });

    return this.toOrganizationMemberWithUser(member);
  }

  async removeMember(
    actorUserId: string,
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const actorMembership = await this.getMembership(actorUserId, organizationId);
    this.assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMemberById(organizationId, memberId);

    if (!canModifyMember(actorMembership.role, targetMembership.role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    if (targetMembership.role === OrganizationRole.OWNER) {
      await this.assertOrganizationHasAnotherOwner(organizationId, memberId);
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }

  private async getMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ApiException(
        'Organization not found',
        'ORGANIZATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return membership;
  }

  private async getMemberById(organizationId: string, memberId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: { user: true },
    });

    if (!membership) {
      throw new ApiException(
        'Organization member not found',
        'MEMBER_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return membership;
  }

  private assertCanManageMembers(role: OrganizationRole): void {
    if (!canManageOrganizationMembers(role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertOrganizationHasAnotherOwner(
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const ownerCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        role: OrganizationRole.OWNER,
        NOT: { id: memberId },
      },
    });

    if (ownerCount === 0) {
      throw new ApiException(
        'Organization must have at least one owner',
        'LAST_OWNER_REQUIRED',
        HttpStatus.CONFLICT,
      );
    }
  }

  private toOrganizationMemberWithUser(
    member: {
      id: string;
      organizationId: string;
      userId: string;
      role: OrganizationRole;
      createdAt: Date;
      user: User;
    },
  ): OrganizationMemberWithUser {
    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      user: this.usersService.toSafeUser(member.user),
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugifyOrganizationName(name);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = appendSlugSuffix(baseSlug, suffix);
      suffix += 1;
    }

    return slug;
  }
}
