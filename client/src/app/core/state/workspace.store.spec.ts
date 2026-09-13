import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { OrganizationService } from '../services/organization.service';
import { ProjectsService } from '../services/projects.service';
import { DashboardStore } from './dashboard.store';
import { OrganizationStore } from './organization.store';
import { ProjectsStore } from './projects.store';
import { TeamStore } from './team.store';
import { WorkspaceStore } from './workspace.store';

const organizations = [
  {
    id: 'org-1',
    name: 'Acme Technologies',
    slug: 'acme',
    role: 'OWNER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const stats = {
  totalProjects: 2,
  activeProjects: 1,
  totalTasks: 8,
  completedTasks: 3,
  overdueTasks: 1,
  charts: {
    tasksByStatus: [{ status: 'TODO', count: 3 }],
    tasksByPriority: [{ priority: 'MEDIUM', count: 5 }],
    projectProgress: [],
  },
};

describe('WorkspaceStore', () => {
  let workspaceStore: InstanceType<typeof WorkspaceStore>;
  let organizationStore: InstanceType<typeof OrganizationStore>;
  let dashboardStore: InstanceType<typeof DashboardStore>;
  let teamStore: InstanceType<typeof TeamStore>;
  let projectsStore: InstanceType<typeof ProjectsStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        WorkspaceStore,
        OrganizationStore,
        DashboardStore,
        TeamStore,
        ProjectsStore,
        OrganizationService,
        DashboardService,
        ProjectsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    workspaceStore = TestBed.inject(WorkspaceStore);
    organizationStore = TestBed.inject(OrganizationStore);
    dashboardStore = TestBed.inject(DashboardStore);
    teamStore = TestBed.inject(TeamStore);
    projectsStore = TestBed.inject(ProjectsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('bootstrap loads organizations, dashboard stats, team members, and projects', async () => {
    const bootstrapPromise = firstValueFrom(workspaceStore.bootstrap());

    const orgRequest = httpMock.expectOne('http://localhost:3001/api/v1/organizations');
    orgRequest.flush({
      success: true,
      data: { organizations },
    });

    const statsRequest = httpMock.expectOne((request) =>
      request.url.includes('/dashboard/stats'),
    );
    statsRequest.flush({
      success: true,
      data: { stats },
    });

    const membersRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    membersRequest.flush({
      success: true,
      data: { members: [] },
    });

    const projectsRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    projectsRequest.flush({
      success: true,
      data: { projects: [] },
    });

    const unreadRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/notifications/unread-count',
    );
    unreadRequest.flush({
      success: true,
      data: { unreadCount: 0 },
    });

    await bootstrapPromise;

    expect(workspaceStore.hasBootstrapped()).toBe(true);
    expect(workspaceStore.isBootstrapping()).toBe(false);
    expect(dashboardStore.stats()).toEqual(stats);
    expect(teamStore.members()).toEqual([]);
    expect(projectsStore.projects()).toEqual([]);
  });

  it('reloadForActiveOrganization refreshes org-scoped slices', async () => {
    organizationStore.setActiveOrganization('org-1');

    const reloadPromise = firstValueFrom(
      workspaceStore.reloadForActiveOrganization(),
    );

    const statsRequest = httpMock.expectOne((request) =>
      request.url.includes('/dashboard/stats'),
    );
    statsRequest.flush({
      success: true,
      data: { stats },
    });

    const membersRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    membersRequest.flush({
      success: true,
      data: { members: [] },
    });

    const projectsRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    projectsRequest.flush({
      success: true,
      data: { projects: [] },
    });

    await reloadPromise;

    expect(dashboardStore.stats()).toEqual(stats);
    expect(teamStore.members()).toEqual([]);
    expect(projectsStore.projects()).toEqual([]);
  });

  it('clearSession resets child stores and bootstrap state', async () => {
    organizationStore.setActiveOrganization('org-1');

    const loadPromise = firstValueFrom(
      dashboardStore.loadStats({ organizationId: 'org-1' }),
    );

    const statsRequest = httpMock.expectOne((request) =>
      request.url.includes('/dashboard/stats'),
    );
    statsRequest.flush({
      success: true,
      data: { stats },
    });

    await loadPromise;

    workspaceStore.clearSession();

    expect(organizationStore.organizations()).toEqual([]);
    expect(organizationStore.activeOrganizationId()).toBeNull();
    expect(dashboardStore.stats()).toBeNull();
    expect(workspaceStore.hasBootstrapped()).toBe(false);
  });
});
