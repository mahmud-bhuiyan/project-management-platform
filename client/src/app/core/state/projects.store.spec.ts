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
});
