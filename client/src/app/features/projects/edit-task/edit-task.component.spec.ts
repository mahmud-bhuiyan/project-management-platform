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
import type { TaskSummary } from '../../../core/models/task.model';
import { ToastService } from '../../../core/services/toast.service';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { EditTaskComponent } from './edit-task.component';

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

const task: TaskSummary = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Login API',
  description: 'Build auth endpoints',
  status: 'TODO',
  priority: 'HIGH',
  assigneeId: null,
  reporterId: 'user-1',
  dueDate: null,
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  assignee: null,
  reporter: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('EditTaskComponent', () => {
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
    findTask: vi.fn((): TaskSummary | null => task),
    loadTask: vi.fn(() => of(task)),
    updateTask: vi.fn(() => of(task)),
  };

  const toastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.projects = signal<ProjectSummary[]>([project]);
    projectsStore.isProjectMembersLoaded.mockReturnValue(true);
    tasksStore.findTask.mockReturnValue(task);
    tasksStore.updateTask.mockReturnValue(of(task));

    await TestBed.configureTestingModule({
      imports: [EditTaskComponent],
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId/tasks/:taskId/edit',
            component: EditTaskComponent,
          },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                projectId: 'project-1',
                taskId: 'task-1',
              }),
            },
            paramMap: of(
              convertToParamMap({
                projectId: 'project-1',
                taskId: 'task-1',
              }),
            ),
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
    tasksStore.findTask.mockReturnValue(task);
    tasksStore.updateTask.mockReturnValue(of(task));
  });

  it('loads cached task values and updates on submit', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EditTaskComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const titleInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="task-form-title"]',
    );
    expect(titleInput?.value).toBe('Login API');

    titleInput!.value = 'Login API v2';
    titleInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(tasksStore.updateTask).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      input: {
        title: 'Login API v2',
        description: 'Build auth endpoints',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: null,
        dueDate: null,
      },
    });
    expect(toastService.success).toHaveBeenCalledWith('Task updated.');
    expect(navigateSpy).toHaveBeenCalledWith([
      '/projects',
      'project-1',
      'tasks',
      'task-1',
    ]);
  });

  it('loads the task from the API when it is not cached', () => {
    tasksStore.findTask.mockReturnValue(null);
    tasksStore.loadTask.mockReturnValue(of(task));

    const fixture = TestBed.createComponent(EditTaskComponent);
    fixture.detectChanges();

    expect(tasksStore.loadTask).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="task-form-title"]',
      ),
    ).toBeTruthy();
  });
});
