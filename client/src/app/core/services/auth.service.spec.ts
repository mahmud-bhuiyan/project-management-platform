import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

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

describe('AuthService', () => {
  let authService: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login stores access token and current user', async () => {
    const loginPromise = firstValueFrom(
      authService.login({
        email: 'admin@acme.com',
        password: 'password123',
      }),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      email: 'admin@acme.com',
      password: 'password123',
    });

    request.flush({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'jwt-access-token',
        user: mockUser,
      },
    });

    await expect(loginPromise).resolves.toEqual(mockUser);
    expect(authService.getAccessToken()).toBe('jwt-access-token');
    expect(authService.currentUser()).toEqual(mockUser);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('refresh updates access token and sends credentials', async () => {
    authService.clearSession();
    (authService as unknown as { accessToken: string | null }).accessToken =
      'old-access-token';

    const refreshPromise = firstValueFrom(authService.refresh());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: 'new-access-token',
      },
    });

    await expect(refreshPromise).resolves.toBe('new-access-token');
    expect(authService.getAccessToken()).toBe('new-access-token');
  });

  it('loadMe loads profile with bearer token', async () => {
    (authService as unknown as { accessToken: string | null }).accessToken =
      'jwt-access-token';

    const mePromise = firstValueFrom(authService.loadMe());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/me');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer jwt-access-token',
    );

    request.flush({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: mockUser,
      },
    });

    await expect(mePromise).resolves.toEqual(mockUser);
    expect(authService.currentUser()).toEqual(mockUser);
  });

  it('getDemoPersonas returns persona list without passwords', async () => {
    const personasPromise = firstValueFrom(authService.getDemoPersonas());

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/demo-personas',
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      message: 'Demo personas retrieved successfully',
      data: {
        personas: [
          { label: 'Company Admin', email: 'admin@acme.dev' },
        ],
      },
    });

    await expect(personasPromise).resolves.toEqual([
      { label: 'Company Admin', email: 'admin@acme.dev' },
    ]);
  });

  it('demoLogin stores access token without sending a password', async () => {
    const demoLoginPromise = firstValueFrom(
      authService.demoLogin('admin@acme.dev'),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/auth/demo-login',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ email: 'admin@acme.dev' });

    request.flush({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'jwt-access-token',
        user: mockUser,
      },
    });

    await expect(demoLoginPromise).resolves.toEqual(mockUser);
    expect(authService.getAccessToken()).toBe('jwt-access-token');
    expect(authService.currentUser()).toEqual(mockUser);
  });

  it('logout clears session and sends credentials', async () => {
    (authService as unknown as { accessToken: string | null }).accessToken =
      'jwt-access-token';
    authService.currentUser.set(mockUser);

    const logoutPromise = firstValueFrom(authService.logout());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });

    await expect(logoutPromise).resolves.toBeUndefined();
    expect(authService.getAccessToken()).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
