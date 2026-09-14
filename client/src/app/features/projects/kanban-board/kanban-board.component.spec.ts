import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskSummary } from '../../../core/models/task.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { RealtimeStore } from '../../../core/state/realtime.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { WorkspaceStore } from '../../../core/state/workspace.store';
import { KanbanBoardComponent } from './kanban-board.component';

const project = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description: 'Marketing site refresh',
  status: 'ACTIVE' as const,
  priority: 'HIGH' as const,
  ownerId: 'user-1',
  startDate: null,
  dueDate: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const task: TaskSummary = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design landing page hero',
  description: 'Include responsive breakpoints.',
  status: 'BACKLOG',
  priority: 'MEDIUM',
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

describe('KanbanBoardComponent', () => {
  let fixture: ComponentFixture<KanbanBoardComponent>;

  const organizationStore = {
    activeOrganization: signal({
      id: 'org-1',
      name: 'Acme Technologies',
      slug: 'acme',
      role: 'OWNER' as const,
    }),
  };

  const projectsStore = {
    projects: signal([project]),
    hasLoaded: signal(true),
  };

  const tasksStore = {
    projectTasks: vi.fn(() => [task]),
    projectTasksError: vi.fn(() => null),
    isLoadingProjectTasks: vi.fn(() => false),
    loadTasks: vi.fn(() => of([task])),
    reorderTasks: vi.fn(() => of([task])),
  };

  const realtimeStore = {
    joinProject: vi.fn(),
    leaveProject: vi.fn(),
  };

  const workspaceStore = {
    isBootstrapping: signal(false),
    hasBootstrapped: signal(true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent],
      providers: [
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: ProjectsStore, useValue: projectsStore },
        { provide: TasksStore, useValue: tasksStore },
        { provide: RealtimeStore, useValue: realtimeStore },
        { provide: WorkspaceStore, useValue: workspaceStore },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ projectId: 'project-1' }) },
            paramMap: of(convertToParamMap({ projectId: 'project-1' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    fixture.detectChanges();
  });

  it('loads tasks for the board', () => {
    expect(tasksStore.loadTasks).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'project-1',
      query: { page: 1, limit: 100 },
      silent: false,
    });
  });

  it('renders kanban columns and cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="kanban-board"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="kanban-column-BACKLOG"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="kanban-card-task-1"]')).toBeTruthy();
  });
});
