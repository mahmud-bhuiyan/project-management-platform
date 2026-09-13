import { HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationRole, type User } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { canManageOrganizationMembers } from '../organizations/utils/organization-role.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { ProjectMemberWithUser } from './projects.types.js';
import { ProjectsService } from './projects.service.js';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
  ) {}

  async listMembers(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<ProjectMemberWithUser[]> {
    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: [{ createdAt: 'asc' }],
    });

    return members.map((member) => this.toProjectMemberWithUser(member));
  }

  async addMember(
    actorUserId: string,
    organizationId: string,
    projectId: string,
    input: { email: string; role?: OrganizationRole },
  ): Promise<ProjectMemberWithUser> {
    const actorMembership = await this.organizationsService.getMembershipForUser(
      actorUserId,
      organizationId,
    );
    this.assertCanManageProjectMembers(actorMembership.role);

    const project = await this.projectsService.getProjectForOrganization(
      organizationId,
      projectId,
    );

    const role = input.role ?? OrganizationRole.MEMBER;
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new ApiException(
        'User not found',
        'USER_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const organizationMembership =
      await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });
    if (!organizationMembership) {
      throw new ApiException(
        'User must be a member of the organization before joining the project',
        'NOT_ORGANIZATION_MEMBER',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingMembership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });
    if (existingMembership) {
      throw new ApiException(
        'User is already a member of this project',
        'PROJECT_MEMBER_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role,
      },
      include: { user: true },
    });

    return this.toProjectMemberWithUser(member);
  }

  async removeMember(
    actorUserId: string,
    organizationId: string,
    projectId: string,
    memberId: string,
  ): Promise<void> {
    const actorMembership = await this.organizationsService.getMembershipForUser(
      actorUserId,
      organizationId,
    );
    this.assertCanManageProjectMembers(actorMembership.role);

    await this.projectsService.getProjectForOrganization(
      organizationId,
      projectId,
    );

    const member = await this.getMemberById(projectId, memberId);

    if (member.userId === member.project.ownerId) {
      throw new ApiException(
        'Cannot remove the project owner from the project',
        'PROJECT_OWNER_REQUIRED',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });
  }

  private async getMemberById(projectId: string, memberId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId,
      },
      include: {
        user: true,
        project: true,
      },
    });

    if (!member) {
      throw new ApiException(
        'Project member not found',
        'PROJECT_MEMBER_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return member;
  }

  private assertCanManageProjectMembers(role: OrganizationRole): void {
    if (!canManageOrganizationMembers(role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toProjectMemberWithUser(
    member: {
      id: string;
      projectId: string;
      userId: string;
      role: OrganizationRole;
      createdAt: Date;
      user: User;
    },
  ): ProjectMemberWithUser {
    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      user: this.usersService.toSafeUser(member.user),
    };
  }
}
