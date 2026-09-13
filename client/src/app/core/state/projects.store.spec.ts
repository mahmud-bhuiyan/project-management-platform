import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProjectsService } from '../services/projects.service';
import { ProjectsStore } from './projects.store';

const project = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description: 'Refresh marketing site UX.',
  status: 'ACTIVE' as const,
  priority: 'HIGH' as const,
  ownerId: 'user-1',
  startDate: null,
  dueDate: '2026-04-01T00:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
  owner: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('ProjectsStore', () => {
  let projectsStore: InstanceType<typeof ProjectsStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectsStore,
        ProjectsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    projectsStore = TestBed.inject(ProjectsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loadProjects stores projects for the active organization', async () => {
    const loadPromise = firstValueFrom(
      projectsStore.loadProjects({ organizationId: 'org-1' }),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    request.flush({
      success: true,
      data: { projects: [project] },
    });

    await loadPromise;

    expect(projectsStore.projects()).toEqual([project]);
    expect(projectsStore.projectsOrganizationId()).toBe('org-1');
    expect(projectsStore.hasLoaded()).toBe(true);
  });

  it('resetForOrganizationSwitch clears cached projects', async () => {
    const loadPromise = firstValueFrom(
      projectsStore.loadProjects({ organizationId: 'org-1' }),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    request.flush({
      success: true,
      data: { projects: [project] },
    });

    await loadPromise;

    projectsStore.resetForOrganizationSwitch();

    expect(projectsStore.projects()).toEqual([]);
    expect(projectsStore.projectsOrganizationId()).toBeNull();
    expect(projectsStore.hasLoaded()).toBe(false);
  });

  it('createProject prepends the new project without refetching', async () => {
    const loadPromise = firstValueFrom(
      projectsStore.loadProjects({ organizationId: 'org-1' }),
    );

    const listRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    listRequest.flush({
      success: true,
      data: { projects: [] },
    });

    await loadPromise;

    const created = {
      ...project,
      id: 'project-2',
      name: 'Mobile Application',
    };

    const createPromise = firstValueFrom(
      projectsStore.createProject({
        organizationId: 'org-1',
        input: { name: 'Mobile Application' },
      }),
    );

    const createRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    createRequest.flush({
      success: true,
      data: { project: created },
    });

    await createPromise;

    expect(projectsStore.projects()).toEqual([created]);
  });

  it('updateProject patches the matching project in the store', async () => {
    const loadPromise = firstValueFrom(
      projectsStore.loadProjects({ organizationId: 'org-1' }),
    );

    const listRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    listRequest.flush({
      success: true,
      data: { projects: [project] },
    });

    await loadPromise;

    const updated = {
      ...project,
      name: 'Website Redesign v2',
      status: 'ACTIVE' as const,
    };

    const updatePromise = firstValueFrom(
      projectsStore.updateProject({
        organizationId: 'org-1',
        projectId: 'project-1',
        input: { name: 'Website Redesign v2', status: 'ACTIVE' },
      }),
    );

    const updateRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1',
    );
    updateRequest.flush({
      success: true,
      data: { project: updated },
    });

    await updatePromise;

    expect(projectsStore.projects()[0].name).toBe('Website Redesign v2');
    expect(projectsStore.projects()[0].status).toBe('ACTIVE');
  });

  it('loadProjectMembers caches members by project id', async () => {
    const member = {
      id: 'pm-1',
      projectId: 'project-1',
      userId: 'user-1',
      role: 'OWNER' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      user: {
        id: 'user-1',
        name: 'Acme Admin',
        email: 'admin@acme.dev',
        platformRole: 'USER' as const,
        avatarUrl: null,
        themePreference: 'LIGHT' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const loadPromise = firstValueFrom(
      projectsStore.loadProjectMembers({
        organizationId: 'org-1',
        projectId: 'project-1',
      }),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/members',
    );
    request.flush({
      success: true,
      data: { members: [member] },
    });

    await loadPromise;

    expect(projectsStore.projectMembers('project-1')).toEqual([member]);
    expect(projectsStore.isProjectMembersLoaded('project-1')).toBe(true);

    const cachedPromise = firstValueFrom(
      projectsStore.loadProjectMembers({
        organizationId: 'org-1',
        projectId: 'project-1',
      }),
    );

    await expect(cachedPromise).resolves.toEqual([member]);
    httpMock.expectNone(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/members',
    );
  });
});
