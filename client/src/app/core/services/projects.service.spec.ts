import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProjectsService } from './projects.service';

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

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    projectsService = TestBed.inject(ProjectsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists projects for an organization', async () => {
    const loadPromise = firstValueFrom(projectsService.listProjects('org-1'));

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: { projects: [project] },
    });

    await expect(loadPromise).resolves.toEqual([project]);
  });
});
