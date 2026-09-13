import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
    createProject: vi.fn(() => of(project)),
    updateProject: vi.fn(() => of(project)),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.projectsError = signal<string | null>(null);
    projectsStore.isLoading = signal(false);
    projectsStore.hasLoaded = signal(true);
    projectsStore.createProject = vi.fn(() => of(project));
    projectsStore.updateProject = vi.fn(() => of(project));

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

  it('shows create controls for organization managers', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-open-create"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="project-edit-project-1"]')).toBeTruthy();
  });

  it('creates a project through the store and closes the modal', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[data-testid="projects-open-create"]')?.click();
    fixture.detectChanges();

    const nameInput = compiled.querySelector<HTMLInputElement>('#project-name');
    const descriptionInput = compiled.querySelector<HTMLTextAreaElement>(
      '#project-description',
    );
    nameInput!.value = 'Mobile Application';
    nameInput!.dispatchEvent(new Event('input'));
    descriptionInput!.value = 'Build the companion app.';
    descriptionInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.projects-form')?.requestSubmit();
    fixture.detectChanges();

    expect(projectsStore.createProject).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        name: 'Mobile Application',
        description: 'Build the companion app.',
        status: 'PLANNING',
        priority: 'MEDIUM',
      },
    });
    expect(compiled.querySelector('#project-name')).toBeNull();
  });

  it('updates a project through the store', () => {
    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[data-testid="project-edit-project-1"]')?.click();
    fixture.detectChanges();

    const nameInput = compiled.querySelector<HTMLInputElement>('#project-name');
    const statusSelect = compiled.querySelector<HTMLSelectElement>('#project-status');
    nameInput!.value = 'Website Redesign v2';
    nameInput!.dispatchEvent(new Event('input'));
    statusSelect!.value = 'ACTIVE';
    statusSelect!.dispatchEvent(new Event('change'));
    compiled.querySelector<HTMLFormElement>('.projects-form')?.requestSubmit();
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
  });

  it('shows an empty state when the store has no projects', () => {
    projectsStore.projects = signal<ProjectSummary[]>([]);

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-empty"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="projects-empty-create"]')).toBeTruthy();
  });

  it('hides create and edit controls for viewers', () => {
    organizationStore.activeOrganization = signal<Organization | null>({
      ...organization,
      role: 'VIEWER',
    });

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-open-create"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="project-edit-project-1"]')).toBeNull();
  });

  it('surfaces API errors in the project form modal', () => {
    projectsStore.createProject = vi.fn(() =>
      throwError(() => ({
        error: { message: 'Duplicate project name' },
      })),
    );

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[data-testid="projects-open-create"]')?.click();
    fixture.detectChanges();

    const nameInput = compiled.querySelector<HTMLInputElement>('#project-name');
    nameInput!.value = 'Website Redesign';
    nameInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.projects-form')?.requestSubmit();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Duplicate project name');
    expect(compiled.querySelector('#project-name')).toBeTruthy();
  });
});
