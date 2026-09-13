import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from './auth.store';

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

describe('AuthStore', () => {
  let authStore: InstanceType<typeof AuthStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    authStore = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login stores access token and current user', async () => {
    const loginPromise = firstValueFrom(
      authStore.login({
        email: 'admin@acme.com',
        password: 'password123',
      }),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/login');
    request.flush({
      success: true,
      data: {
        accessToken: 'jwt-access-token',
        user: mockUser,
      },
    });

    await expect(loginPromise).resolves.toEqual(mockUser);
    expect(authStore.getAccessToken()).toBe('jwt-access-token');
    expect(authStore.currentUser()).toEqual(mockUser);
    expect(authStore.isAuthenticated()).toBe(true);
  });

  it('clearSession resets auth state', () => {
    authStore.setSession('jwt-access-token', mockUser);
    authStore.clearSession();

    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.currentUser()).toBeNull();
    expect(authStore.isAuthenticated()).toBe(false);
  });
});
