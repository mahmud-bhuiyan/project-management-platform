import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  LoginCredentials,
  LoginResponseData,
  MeResponseData,
  RefreshResponseData,
} from '../models/auth.model';
import type { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private accessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(
    () => this.accessToken !== null && this.currentUser() !== null,
  );

  login(credentials: LoginCredentials): Observable<User> {
    return this.http
      .post<ApiSuccessResponse<LoginResponseData>>(
        `${this.apiUrl}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.accessToken = response.data.accessToken;
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
    return this.http
      .post<ApiSuccessResponse<RefreshResponseData>>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.accessToken = response.data.accessToken;
        }),
        map((response) => response.data.accessToken),
      );
  }

  loadMe(): Observable<User> {
    return this.http
      .get<ApiSuccessResponse<MeResponseData>>(`${this.apiUrl}/auth/me`, {
        headers: this.authHeaders(),
      })
      .pipe(
        tap((response) => this.currentUser.set(response.data.user)),
        map((response) => response.data.user),
      );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearSession(): void {
    this.accessToken = null;
    this.currentUser.set(null);
  }

  private authHeaders(): HttpHeaders {
    const token = this.accessToken;

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
