import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

/** Thin HTTP facade for auth endpoints — session state lives in AuthStore. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDemoPersonas(): Observable<DemoPersona[]> {
    return this.http
      .get<ApiSuccessResponse<DemoPersonasResponseData>>(
        `${this.apiUrl}/auth/demo-personas`,
      )
      .pipe(map((response) => response.data.personas));
  }

  demoLogin(email: string): Observable<LoginResponseData> {
    return this.http
      .post<ApiSuccessResponse<LoginResponseData>>(
        `${this.apiUrl}/auth/demo-login`,
        { email },
        { withCredentials: true },
      )
      .pipe(map((response) => response.data));
  }

  login(credentials: LoginCredentials): Observable<LoginResponseData> {
    return this.http
      .post<ApiSuccessResponse<LoginResponseData>>(
        `${this.apiUrl}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(map((response) => response.data));
  }

  logout(): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<null>>(
        `${this.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(map(() => undefined));
  }

  refresh(): Observable<string> {
    return this.http
      .post<ApiSuccessResponse<RefreshResponseData>>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(map((response) => response.data.accessToken));
  }

  loadMe(): Observable<User> {
    return this.http
      .get<ApiSuccessResponse<MeResponseData>>(`${this.apiUrl}/auth/me`)
      .pipe(map((response) => response.data.user));
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
}
