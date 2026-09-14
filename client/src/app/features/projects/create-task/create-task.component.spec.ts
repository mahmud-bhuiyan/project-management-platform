import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import type { Organization } from '../../../core/models/organization.model';
import type { ProjectSummary } from '../../../core/models/project.model';
import { ToastService } from '../../../core/services/toast.service';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { CreateTaskComponent } from './create-task.component';

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
  dueDate: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owner: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('CreateTaskComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    projects: signal<ProjectSummary[]>([project]),
    projectMembers: vi.fn(() => []),
    isProjectMembersLoaded: vi.fn(() => true),
    loadProjectMembers: vi.fn(() => of(undefined)),
  };

  const tasksStore = {
    createTask: vi.fn(() => of(undefined)),
  };

  const toastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.isProjectMembersLoaded.mockReturnValue(true);
    tasksStore.createTask = vi.fn(() => of(undefined));

    await TestBed.configureTestingModule({
      imports: [CreateTaskComponent],
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId/tasks/new',
            component: CreateTaskComponent,
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
        { provide: TasksStore, useValue: tasksStore },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    tasksStore.createTask = vi.fn(() => of(undefined));
  });

  it('creates a task and navigates back to the project', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const titleInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="task-form-title"]',
    );
    titleInput!.value = 'Login API';
    titleInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(tasksStore.createTask).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      input: {
        title: 'Login API',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        assigneeId: null,
        dueDate: null,
      },
    });
    expect(toastService.success).toHaveBeenCalledWith('Task created.');
    expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'project-1']);
  });

  it('shows validation errors when the title is empty', () => {
    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('.project-form') as HTMLFormElement | null;
    form?.requestSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Title is required.');
    expect(tasksStore.createTask).not.toHaveBeenCalled();
  });

  it('shows API errors on the form and toast', () => {
    tasksStore.createTask = vi.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            error: { message: 'Viewer cannot create tasks' },
          }),
      ),
    );

    const fixture = TestBed.createComponent(CreateTaskComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const titleInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="task-form-title"]',
    );
    titleInput!.value = 'Blocked task';
    titleInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Viewer cannot create tasks');
    expect(toastService.error).toHaveBeenCalledWith('Viewer cannot create tasks');
  });
});
