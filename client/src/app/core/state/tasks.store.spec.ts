import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TasksService } from '../services/tasks.service';
import { TasksStore } from './tasks.store';

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design landing page hero',
  description: 'Include responsive breakpoints.',
  status: 'BACKLOG' as const,
  priority: 'MEDIUM' as const,
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

describe('TasksStore', () => {
  let tasksStore: InstanceType<typeof TasksStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TasksStore,
        TasksService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    tasksStore = TestBed.inject(TasksStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loadTasks stores paginated tasks for a project', async () => {
    const loadPromise = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query: { page: 1, limit: 20, status: 'BACKLOG' },
      }),
    );

    const request = httpMock.expectOne(
      (req) =>
        req.url ===
          'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks' &&
        req.params.get('page') === '1' &&
        req.params.get('limit') === '20' &&
        req.params.get('status') === 'BACKLOG',
    );
    request.flush({
      success: true,
      data: { tasks: [task] },
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    await loadPromise;

    expect(tasksStore.projectTasks('project-1')).toEqual([task]);
    expect(tasksStore.projectTasksMeta('project-1').total).toBe(1);
  });

  it('returns cached tasks without refetching the same query', async () => {
    const query = { page: 1, limit: 20 };

    const firstLoad = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query,
      }),
    );

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=20',
      )
      .flush({
        success: true,
        data: { tasks: [task] },
        meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
      });

    await firstLoad;

    const secondLoad = await firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query,
      }),
    );

    expect(secondLoad).toEqual([task]);
    httpMock.expectNone(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=20',
    );
  });

  it('reorderTasks optimistically patches the cache before the API responds', async () => {
    const query = { page: 1, limit: 100 };
    const optimisticTask = { ...task, status: 'IN_PROGRESS' as const, position: 0 };

    const loadPromise = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query,
      }),
    );

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=100',
      )
      .flush({
        success: true,
        data: { tasks: [task] },
        meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
      });

    await loadPromise;

    const reorderPromise = firstValueFrom(
      tasksStore.reorderTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        optimisticTasks: [optimisticTask],
        items: [{ taskId: task.id, status: 'IN_PROGRESS', position: 0 }],
      }),
    );

    expect(tasksStore.projectTasks('project-1')).toEqual([optimisticTask]);

    const reorderRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks/reorder',
    );
    reorderRequest.flush({
      success: true,
      data: { tasks: [optimisticTask] },
    });

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=100',
      )
      .flush({
        success: true,
        data: { tasks: [optimisticTask] },
        meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
      });

    await reorderPromise;
  });

  it('reorderTasks rolls back the cache when the API fails', async () => {
    const query = { page: 1, limit: 100 };
    const optimisticTask = { ...task, status: 'IN_PROGRESS' as const, position: 0 };

    const loadPromise = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query,
      }),
    );

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=100',
      )
      .flush({
        success: true,
        data: { tasks: [task] },
        meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
      });

    await loadPromise;

    const reorderPromise = firstValueFrom(
      tasksStore.reorderTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        optimisticTasks: [optimisticTask],
        items: [{ taskId: task.id, status: 'IN_PROGRESS', position: 0 }],
      }),
    );

    expect(tasksStore.projectTasks('project-1')).toEqual([optimisticTask]);

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks/reorder',
      )
      .flush(
        { success: false, message: 'Reorder failed' },
        { status: 500, statusText: 'Server Error' },
      );

    await expect(reorderPromise).rejects.toBeTruthy();
    expect(tasksStore.projectTasks('project-1')).toEqual([task]);
  });

  it('reorderTasks refreshes cached tasks after a successful move', async () => {
    const query = { page: 1, limit: 100 };
    const movedTask = { ...task, status: 'IN_PROGRESS' as const, position: 0 };

    const loadPromise = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        query,
      }),
    );

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=100',
      )
      .flush({
        success: true,
        data: { tasks: [task] },
        meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
      });

    await loadPromise;

    const reorderPromise = firstValueFrom(
      tasksStore.reorderTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
        items: [{ taskId: task.id, status: 'IN_PROGRESS', position: 0 }],
      }),
    );

    const reorderRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks/reorder',
    );
    expect(reorderRequest.request.method).toBe('PATCH');
    reorderRequest.flush({
      success: true,
      data: { tasks: [movedTask] },
    });

    const refreshRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=100',
    );
    refreshRequest.flush({
      success: true,
      data: { tasks: [movedTask] },
      meta: { page: 1, perPage: 100, total: 1, totalPages: 1 },
    });

    await reorderPromise;

    expect(tasksStore.projectTasks('project-1')).toEqual([movedTask]);
  });

  it('resetForOrganizationSwitch clears cached tasks', async () => {
    const loadPromise = firstValueFrom(
      tasksStore.loadTasks({
        organizationId: 'org-1',
        projectId: 'project-1',
      }),
    );

    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks?page=1&limit=20',
      )
      .flush({
        success: true,
        data: { tasks: [task] },
        meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
      });

    await loadPromise;
    tasksStore.resetForOrganizationSwitch();

    expect(tasksStore.projectTasks('project-1')).toEqual([]);
  });
});
