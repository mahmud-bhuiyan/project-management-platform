import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { Organization } from '../../../core/models/organization.model';
import type { ProjectSummary } from '../../../core/models/project.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { ProjectDetailComponent } from './project-detail.component';

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

describe('ProjectDetailComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    projects: signal<ProjectSummary[]>([project]),
    hasLoaded: signal(true),
    membersByProjectId: signal<Record<string, typeof member[]>>({}),
    membersLoadedProjectIds: signal<string[]>([]),
    membersLoadingProjectId: signal<string | null>(null),
    membersErrorByProjectId: signal<Record<string, string | null>>({}),
    projectMembers: vi.fn(() => [] as typeof member[]),
    isProjectMembersLoaded: vi.fn(() => false),
    loadProjectMembers: vi.fn(() => of([member])),
  };

  const tasksStore = {
    projectTasks: vi.fn(() => []),
    projectTasksMeta: vi.fn(() => ({
      page: 1,
      perPage: 20,
      total: 0,
      totalPages: 0,
    })),
    projectTasksError: vi.fn(() => null),
    isLoadingProjectTasks: vi.fn(() => false),
    isProjectTasksLoaded: vi.fn(() => false),
    loadTasks: vi.fn(() => of([])),
    deleteTask: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.hasLoaded = signal(true);
    projectsStore.membersByProjectId = signal({});
    projectsStore.membersLoadedProjectIds = signal([]);
    projectsStore.membersLoadingProjectId = signal(null);
    projectsStore.membersErrorByProjectId = signal({});
    projectsStore.projectMembers = vi.fn(() => []);
    projectsStore.isProjectMembersLoaded = vi.fn(() => false);
    projectsStore.loadProjectMembers = vi.fn(() => of([member]));

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideRouter([]),
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
        { provide: TasksStore, useValue: tasksStore },
      ],
    }).compileComponents();
  });

  it('renders tasks as the primary project view without refetching the project', () => {
    const fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="project-detail-overview"]')).toBeFalsy();
    expect(compiled.querySelector('[data-testid="project-detail-tasks"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Website Redesign');
    expect(compiled.textContent).toContain('Delivery work tracked for this project.');
    expect(projectsStore.loadProjectMembers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      silent: false,
    });
  });

  it('shows cached members without reloading when already loaded', () => {
    projectsStore.isProjectMembersLoaded = vi.fn(() => true);
    projectsStore.projectMembers = vi.fn(() => [member]);

    const fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="project-member-pm-1"]')).toBeTruthy();
    expect(projectsStore.loadProjectMembers).not.toHaveBeenCalled();
  });

  it('shows not found when the project is missing from the store', () => {
    projectsStore.projects = signal<ProjectSummary[]>([]);

    const fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Project not found');
  });

  it('loads tasks for the project and renders the tasks section', () => {
    const fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="project-detail-tasks"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="project-detail-create-task"]')).toBeTruthy();
    expect(tasksStore.loadTasks).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      query: {
        page: 1,
        limit: 100,
        status: undefined,
        priority: undefined,
        assigneeId: undefined,
        dueFrom: undefined,
        dueTo: undefined,
        search: undefined,
      },
      silent: false,
    });
  });

  it('reloads tasks when the status filter changes', () => {
    const fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();

    tasksStore.loadTasks = vi.fn(() => of([]));

    const select = fixture.nativeElement.querySelector(
      '[data-testid="project-detail-task-status-filter"]',
    ) as HTMLSelectElement;
    select.value = 'BACKLOG';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(tasksStore.loadTasks).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      query: {
        page: 1,
        limit: 100,
        status: 'BACKLOG',
        priority: undefined,
        assigneeId: undefined,
        dueFrom: undefined,
        dueTo: undefined,
        search: undefined,
      },
      silent: false,
    });
  });

});
