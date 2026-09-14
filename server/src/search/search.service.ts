import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { canManageOrganizationMembers } from '../organizations/utils/organization-role.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  GlobalSearchResultType,
  type GlobalSearchQuery,
  type GlobalSearchResponse,
  type GlobalSearchResult,
} from './search.types.js';

type SortableSearchResult = GlobalSearchResult & { sortKey: string };

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async search(
    userId: string,
    organizationId: string,
    query: GlobalSearchQuery,
  ): Promise<GlobalSearchResponse> {
    const membership = await this.organizationsService.findOneForUser(
      userId,
      organizationId,
    );

    const searchTerm = query.q.trim();
    const isManager = canManageOrganizationMembers(membership.role);
    const projectAccessFilter = this.buildProjectAccessFilter(
      organizationId,
      userId,
      isManager,
    );
    const includeTasks =
      !query.type || query.type === GlobalSearchResultType.TASK;
    const includeProjects =
      !query.type || query.type === GlobalSearchResultType.PROJECT;
    const includeUsers =
      !query.type || query.type === GlobalSearchResultType.USER;

    const [tasks, projects, users] = await Promise.all([
      includeTasks
        ? this.findMatchingTasks(projectAccessFilter, searchTerm)
        : Promise.resolve([]),
      includeProjects
        ? this.findMatchingProjects(projectAccessFilter, searchTerm)
        : Promise.resolve([]),
      includeUsers
        ? this.findMatchingUsers(organizationId, searchTerm)
        : Promise.resolve([]),
    ]);

    const merged = this.mergeAndSortResults(tasks, projects, users);
    const total = merged.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const start = (query.page - 1) * query.limit;
    const results = merged.slice(start, start + query.limit).map(({ sortKey, ...result }) => result);

    return {
      results,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    };
  }

  private buildProjectAccessFilter(
    organizationId: string,
    userId: string,
    isManager: boolean,
  ): Prisma.ProjectWhereInput {
    return isManager
      ? { organizationId }
      : {
          organizationId,
          members: { some: { userId } },
        };
  }

  private async findMatchingTasks(
    projectAccessFilter: Prisma.ProjectWhereInput,
    searchTerm: string,
  ) {
    return this.prisma.task.findMany({
      where: {
        project: projectAccessFilter,
        title: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        status: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ title: 'asc' }],
    });
  }

  private async findMatchingProjects(
    projectAccessFilter: Prisma.ProjectWhereInput,
    searchTerm: string,
  ) {
    return this.prisma.project.findMany({
      where: {
        ...projectAccessFilter,
        archivedAt: null,
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  private async findMatchingUsers(organizationId: string, searchTerm: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        user: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ user: { name: 'asc' } }],
    });

    return members.map((member) => member.user);
  }

  private mergeAndSortResults(
    tasks: Awaited<ReturnType<SearchService['findMatchingTasks']>>,
    projects: Awaited<ReturnType<SearchService['findMatchingProjects']>>,
    users: Awaited<ReturnType<SearchService['findMatchingUsers']>>,
  ): SortableSearchResult[] {
    const results: SortableSearchResult[] = [
      ...tasks.map(
        (task): SortableSearchResult => ({
          type: GlobalSearchResultType.TASK,
          id: task.id,
          title: task.title,
          projectId: task.project.id,
          projectName: task.project.name,
          status: task.status,
          sortKey: task.title.toLowerCase(),
        }),
      ),
      ...projects.map(
        (project): SortableSearchResult => ({
          type: GlobalSearchResultType.PROJECT,
          id: project.id,
          name: project.name,
          status: project.status,
          sortKey: project.name.toLowerCase(),
        }),
      ),
      ...users.map(
        (user): SortableSearchResult => ({
          type: GlobalSearchResultType.USER,
          id: user.id,
          name: user.name,
          email: user.email,
          sortKey: user.name.toLowerCase(),
        }),
      ),
    ];

    return results.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
  }
}
