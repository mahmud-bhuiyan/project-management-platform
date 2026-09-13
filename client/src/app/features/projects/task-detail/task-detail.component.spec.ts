import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Organization } from '../../../core/models/organization.model';
import type { ProjectSummary } from '../../../core/models/project.model';
import { AuthStore } from '../../../core/state/auth.store';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TaskDetailStore } from '../../../core/state/task-detail.store';
import { RealtimeStore } from '../../../core/state/realtime.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { TaskDetailComponent } from './task-detail.component';

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

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design hero',
  description: 'Responsive layout',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  assigneeId: null,
  reporterId: 'user-1',
  dueDate: null,
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  assignee: null,
  reporter: {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('TaskDetailComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    projects: signal<ProjectSummary[]>([project]),
    projectMembers: vi.fn(() => []),
    isProjectMembersLoaded: vi.fn(() => true),
    loadProjectMembers: vi.fn(() => of([])),
  };

  const tasksStore = {
    findTask: vi.fn(() => task),
    loadTask: vi.fn(() => of(task)),
  };

  const taskDetailStore = {
    subtasks: vi.fn(() => [
      {
        id: 'subtask-1',
        taskId: 'task-1',
        title: 'Wireframes',
        completed: true,
        position: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'subtask-2',
        taskId: 'task-1',
        title: 'Copy review',
        completed: false,
        position: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
    comments: vi.fn(() => []),
    activity: vi.fn(() => []),
    detailError: vi.fn(() => null),
    isLoadingDetail: vi.fn(() => false),
    isDetailLoaded: vi.fn(() => true),
    loadDetail: vi.fn(() => of(undefined)),
    createSubtask: vi.fn(() => of({})),
    updateSubtask: vi.fn(() => of({})),
    createComment: vi.fn(() => of({})),
    updateComment: vi.fn(() => of({})),
    deleteComment: vi.fn(() => of(undefined)),
  };

  const realtimeStore = {
    joinProject: vi.fn(),
    leaveProject: vi.fn(),
  };

  const authStore = {
    currentUser: signal({
      id: 'user-1',
      email: 'admin@acme.dev',
      name: 'Admin',
      platformRole: 'USER' as const,
      avatarUrl: null,
      themePreference: 'LIGHT' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
      providers: [
        provideRouter([]),
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
        { provide: TaskDetailStore, useValue: taskDetailStore },
        { provide: AuthStore, useValue: authStore },
        { provide: RealtimeStore, useValue: realtimeStore },
      ],
    }).compileComponents();
  });

  it('renders task overview and subtask progress', () => {
    const fixture = TestBed.createComponent(TaskDetailComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Design hero');
    expect(element.textContent).toContain('1 / 2 subtasks completed');
    expect(element.querySelector('[data-testid="task-detail-overview"]')).toBeTruthy();
    expect(element.querySelector('[data-testid="task-detail-subtasks"]')).toBeTruthy();
  });
});
