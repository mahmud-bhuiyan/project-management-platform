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
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { AuthStore } from '../core/state/auth.store';
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
  let authStore: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        AuthService,
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches bearer token to outgoing requests', async () => {
    authStore.setSession('jwt-access-token', mockUser);

    const mePromise = firstValueFrom(
      http.get('http://localhost:3001/api/v1/auth/me'),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/auth/me');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer jwt-access-token',
    );

    request.flush({
      success: true,
      data: { user: mockUser },
    });

    await mePromise;
  });
});
