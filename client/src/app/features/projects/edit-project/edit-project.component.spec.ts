import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of } from 'rxjs';
import type { Organization } from '../../../core/models/organization.model';
import type { ProjectSummary } from '../../../core/models/project.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { EditProjectComponent } from './edit-project.component';

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const project: ProjectSummary = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description: 'Refresh marketing site UX.',
  status: 'ACTIVE',
  priority: 'HIGH',
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

describe('EditProjectComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    projects: signal<ProjectSummary[]>([project]),
    hasLoaded: signal(true),
    updateProject: vi.fn(() => of({ ...project, name: 'Website Redesign v2' })),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.hasLoaded = signal(true);
    projectsStore.updateProject = vi.fn(() =>
      of({ ...project, name: 'Website Redesign v2' }),
    );

    await TestBed.configureTestingModule({
      imports: [EditProjectComponent],
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId/edit',
            component: EditProjectComponent,
          },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ projectId: 'project-1' }),
            },
            paramMap: of(convertToParamMap({ projectId: 'project-1' })),
          },
        },
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: ProjectsStore, useValue: projectsStore },
      ],
    }).compileComponents();
  });

  it('loads project values from the store and updates on submit', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EditProjectComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="project-form-name"]',
    );
    expect(nameInput?.value).toBe('Website Redesign');

    nameInput!.value = 'Website Redesign v2';
    nameInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(projectsStore.updateProject).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      input: {
        name: 'Website Redesign v2',
        description: 'Refresh marketing site UX.',
        status: 'ACTIVE',
        priority: 'HIGH',
        startDate: null,
        dueDate: '2026-04-01',
      },
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'project-1']);
  });

  it('shows a not-found message when the project is missing from the store', () => {
    projectsStore.projects = signal<ProjectSummary[]>([]);

    const fixture = TestBed.createComponent(EditProjectComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Project not found');
  });
});
