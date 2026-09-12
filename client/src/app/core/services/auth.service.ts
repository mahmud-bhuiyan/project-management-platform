import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  CreateCompanyAdminRequest,
  CreateCompanyAdminResponseData,
  DemoPersona,
  DemoPersonasResponseData,
  LoginCredentials,
  LoginResponseData,
  MeResponseData,
  RefreshResponseData,
} from '../models/auth.model';
import type { User } from '../models/user.model';

/**
 * Session state (singleton). Updated only on login, logout, refresh, and loadMe.
 * UI loading flags stay in components — never add page-level spinners here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly accessToken = signal<string | null>(null);
  private refreshRequest: Observable<string> | null = null;

  /** Shared session user — shell and pages read this signal; no refetch on route change. */
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(
    () => this.accessToken() !== null && this.currentUser() !== null,
  );
  readonly isSuperadmin = computed(
    () => this.currentUser()?.platformRole === 'SUPERADMIN',
  );

  getDemoPersonas(): Observable<DemoPersona[]> {
    return this.http
      .get<ApiSuccessResponse<DemoPersonasResponseData>>(
        `${this.apiUrl}/auth/demo-personas`,
      )
      .pipe(map((response) => response.data.personas));
  }

  demoLogin(email: string): Observable<User> {
    return this.http
      .post<ApiSuccessResponse<LoginResponseData>>(
        `${this.apiUrl}/auth/demo-login`,
        { email },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.accessToken.set(response.data.accessToken);
          this.currentUser.set(response.data.user);
        }),
        map((response) => response.data.user),
      );
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.http
      .post<ApiSuccessResponse<LoginResponseData>>(
        `${this.apiUrl}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.accessToken.set(response.data.accessToken);
          this.currentUser.set(response.data.user);
        }),
        map((response) => response.data.user),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<null>>(
        `${this.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(() => this.clearSession()),
        map(() => undefined),
      );
  }

  refresh(): Observable<string> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.http
        .post<ApiSuccessResponse<RefreshResponseData>>(
          `${this.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          tap((response) => {
            this.accessToken.set(response.data.accessToken);
          }),
          map((response) => response.data.accessToken),
          shareReplay(1),
          finalize(() => {
            this.refreshRequest = null;
          }),
        );
    }

    return this.refreshRequest;
  }

  restoreSession(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    return this.refresh().pipe(
      switchMap(() => this.loadMe()),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  createCompanyAdmin(
    payload: CreateCompanyAdminRequest,
  ): Observable<CreateCompanyAdminResponseData> {
    return this.http
      .post<ApiSuccessResponse<CreateCompanyAdminResponseData>>(
        `${this.apiUrl}/auth/company-admins`,
        payload,
      )
      .pipe(map((response) => response.data));
  }

  loadMe(): Observable<User> {
    return this.http
      .get<ApiSuccessResponse<MeResponseData>>(`${this.apiUrl}/auth/me`)
      .pipe(
        tap((response) => this.currentUser.set(response.data.user)),
        map((response) => response.data.user),
      );
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}
