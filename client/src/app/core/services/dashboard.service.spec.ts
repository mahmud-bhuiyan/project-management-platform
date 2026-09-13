import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    dashboardService = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads dashboard stats for an organization', async () => {
    const loadPromise = firstValueFrom(dashboardService.loadStats('org-1'));

    const request = httpMock.expectOne(
      (req) =>
        req.url === 'http://localhost:3001/api/v1/dashboard/stats' &&
        req.params.get('organizationId') === 'org-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        stats: {
          totalProjects: 2,
          activeProjects: 1,
          totalTasks: 8,
          completedTasks: 3,
          overdueTasks: 1,
        },
      },
    });

    await expect(loadPromise).resolves.toEqual({
      totalProjects: 2,
      activeProjects: 1,
      totalTasks: 8,
      completedTasks: 3,
      overdueTasks: 1,
    });
  });
});
