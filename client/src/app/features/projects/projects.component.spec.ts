import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Organization } from '../../core/models/organization.model';
import type { ProjectSummary } from '../../core/models/project.model';
import { OrganizationStore } from '../../core/state/organization.store';
import { ProjectsStore } from '../../core/state/projects.store';
import { ProjectsComponent } from './projects.component';

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

describe('ProjectsComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    projects: signal<ProjectSummary[]>([project]),
    projectsError: signal<string | null>(null),
    isLoading: signal(false),
    hasLoaded: signal(true),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.projectsError = signal<string | null>(null);
    projectsStore.isLoading = signal(false);
    projectsStore.hasLoaded = signal(true);

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: ProjectsStore, useValue: projectsStore },
      ],
    }).compileComponents();
  });

  it('displays projects from the store without fetching on init', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-grid"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="project-card-project-1"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Website Redesign');
  });

  it('shows an empty state when the store has no projects', () => {
    projectsStore.projects = signal<ProjectSummary[]>([]);

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-empty"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="projects-grid"]')).toBeNull();
  });

  it('shows a message when no organization is selected', () => {
    organizationStore.activeOrganization = signal<Organization | null>(null);

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No organization selected');
  });

  it('shows an inline error from the store', () => {
    projectsStore.projects = signal<ProjectSummary[]>([]);
    projectsStore.projectsError = signal('Could not load projects');

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Could not load projects');
  });
});
