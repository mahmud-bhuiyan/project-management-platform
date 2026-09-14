import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TasksService } from './tasks.service';

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Login API',
  description: 'Build auth endpoints',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  assigneeId: 'user-2',
  reporterId: 'user-1',
  dueDate: '2026-04-01T00:00:00.000Z',
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  assignee: {
    id: 'user-2',
    name: 'Team Member',
    email: 'member@acme.dev',
    avatarUrl: null,
  },
  reporter: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('TasksService', () => {
  let tasksService: TasksService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TasksService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    tasksService = TestBed.inject(TasksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists tasks with filters and pagination params', async () => {
    const loadPromise = firstValueFrom(tasksService.listTasks('org-1', 'project-1', {
      page: 1,
      limit: 20,
      status: 'TODO',
      priority: 'HIGH',
      assigneeId: 'user-2',
      search: 'login',
      dueFrom: '2026-04-01',
      dueTo: '2026-04-30',
    }));

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/organizations/org-1/projects/project-1/tasks'),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('status')).toBe('TODO');
    expect(request.request.params.get('priority')).toBe('HIGH');
    expect(request.request.params.get('assigneeId')).toBe('user-2');
    expect(request.request.params.get('search')).toBe('login');
    expect(request.request.params.get('dueFrom')).toBe('2026-04-01');
    expect(request.request.params.get('dueTo')).toBe('2026-04-30');
    request.flush({
      success: true,
      data: { tasks: [task] },
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });

    await expect(loadPromise).resolves.toEqual({
      tasks: [task],
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    });
  });

  it('creates a task', async () => {
    const createPromise = firstValueFrom(tasksService.createTask('org-1', 'project-1', {
      title: 'Login API',
      status: 'TODO',
      priority: 'HIGH',
    }));

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks',
    );
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, data: { task } });

    await expect(createPromise).resolves.toEqual(task);
  });

  it('reorders tasks for the Kanban board', async () => {
    const reorderPromise = firstValueFrom(tasksService.reorderTasks('org-1', 'project-1', [
      { taskId: 'task-1', status: 'IN_PROGRESS', position: 0 },
    ]));

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/projects/project-1/tasks/reorder',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      items: [{ taskId: 'task-1', status: 'IN_PROGRESS', position: 0 }],
    });
    request.flush({ success: true, data: { tasks: [task] } });

    await expect(reorderPromise).resolves.toEqual([task]);
  });
});
