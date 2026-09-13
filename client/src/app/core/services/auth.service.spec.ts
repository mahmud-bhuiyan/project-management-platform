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
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login returns access token and user', async () => {
    const loginPromise = firstValueFrom(
      authService.login({
        email: 'admin@acme.com',
        password: 'password123',
      }),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/login');
    request.flush({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'jwt-access-token',
        user: mockUser,
      },
    });

    await expect(loginPromise).resolves.toEqual({
      accessToken: 'jwt-access-token',
      user: mockUser,
    });
  });

  it('refresh returns a new access token', async () => {
    const refreshPromise = firstValueFrom(authService.refresh());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/refresh');
    request.flush({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: 'new-access-token',
      },
    });

    await expect(refreshPromise).resolves.toBe('new-access-token');
  });

  it('loadMe returns the current user profile', async () => {
    const mePromise = firstValueFrom(authService.loadMe());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/me');
    request.flush({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: mockUser,
      },
    });

    await expect(mePromise).resolves.toEqual(mockUser);
  });
});
