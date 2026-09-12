import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { authInterceptor } from './auth.interceptor';

const mockUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Acme Admin',
  platformRole: 'USER' as const,
  avatarUrl: null,
  themePreference: 'LIGHT' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches bearer token to outgoing requests', async () => {
    authService['accessToken'].set('jwt-access-token');

    const mePromise = firstValueFrom(
      http.get('http://localhost:3001/api/v1/auth/me'),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/me');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer jwt-access-token',
    );

    request.flush({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: mockUser },
    });

    await expect(mePromise).resolves.toEqual({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: mockUser },
    });
  });

  it('refreshes once and retries the original request on 401', async () => {
    authService['accessToken'].set('expired-token');

    const mePromise = firstValueFrom(
      http.get('http://localhost:3001/api/v1/auth/me'),
    );

    const firstRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/me',
    );
    expect(firstRequest.request.headers.get('Authorization')).toBe(
      'Bearer expired-token',
    );
    firstRequest.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refreshRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/refresh',
    );
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.withCredentials).toBe(true);
    refreshRequest.flush({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken: 'new-access-token' },
    });

    const retryRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/me',
    );
    expect(retryRequest.request.headers.get('Authorization')).toBe(
      'Bearer new-access-token',
    );
    expect(retryRequest.request.headers.get('X-Auth-Retry')).toBe('true');
    retryRequest.flush({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: mockUser },
    });

    await expect(mePromise).resolves.toEqual({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: mockUser },
    });
    expect(authService.getAccessToken()).toBe('new-access-token');
  });

  it('clears session and redirects to login when refresh fails', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    authService['accessToken'].set('expired-token');
    authService.currentUser.set(mockUser);

    const mePromise = firstValueFrom(
      http.get('http://localhost:3001/api/v1/auth/me'),
    );

    const firstRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/me',
    );
    firstRequest.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refreshRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/refresh',
    );
    refreshRequest.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(mePromise).rejects.toBeTruthy();
    expect(authService.getAccessToken()).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
