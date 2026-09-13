import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  OrganizationMemberResponseData,
  OrganizationMembersResponseData,
} from '../models/organization-member.model';
import type {
  Organization,
  OrganizationRole,
  OrganizationsResponseData,
} from '../models/organization.model';

const STORAGE_KEY = 'flowdesk:activeOrganizationId';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly organizations = signal<Organization[]>([]);
  readonly activeOrganizationId = signal<string | null>(
    this.readStoredOrganizationId(),
  );
  readonly activeOrganization = computed(() => {
    const activeId = this.activeOrganizationId();
    return (
      this.organizations().find((organization) => organization.id === activeId) ??
      null
    );
  });
  readonly isLoading = signal(false);

  loadOrganizations(): Observable<Organization[]> {
    this.isLoading.set(true);

    return this.http
      .get<ApiSuccessResponse<OrganizationsResponseData>>(
        `${this.apiUrl}/organizations`,
      )
      .pipe(
        map((response) => response.data.organizations),
        tap((organizations) => {
          this.organizations.set(organizations);
          this.syncActiveOrganization(organizations);
        }),
        finalize(() => this.isLoading.set(false)),
      );
  }

  setActiveOrganization(organizationId: string): void {
    this.activeOrganizationId.set(organizationId);
    this.persistOrganizationId(organizationId);
  }

  clear(): void {
    this.organizations.set([]);
    this.activeOrganizationId.set(null);
    this.removeStoredOrganizationId();
  }

  loadMembers(organizationId: string) {
    return this.http
      .get<ApiSuccessResponse<OrganizationMembersResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/members`,
      )
      .pipe(map((response) => response.data.members));
  }

  addMember(
    organizationId: string,
    input: { email: string; role?: OrganizationRole },
  ) {
    return this.http
      .post<ApiSuccessResponse<OrganizationMemberResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/members`,
        input,
      )
      .pipe(map((response) => response.data.member));
  }

  updateMemberRole(
    organizationId: string,
    memberId: string,
    role: OrganizationRole,
  ) {
    return this.http
      .patch<ApiSuccessResponse<OrganizationMemberResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/members/${memberId}`,
        { role },
      )
      .pipe(map((response) => response.data.member));
  }

  removeMember(organizationId: string, memberId: string) {
    return this.http
      .delete<ApiSuccessResponse<null>>(
        `${this.apiUrl}/organizations/${organizationId}/members/${memberId}`,
      )
      .pipe(map(() => undefined));
  }

  private syncActiveOrganization(organizations: Organization[]): void {
    const storedId = this.activeOrganizationId();

    if (storedId && organizations.some((organization) => organization.id === storedId)) {
      return;
    }

    if (organizations.length > 0) {
      this.setActiveOrganization(organizations[0].id);
      return;
    }

    this.activeOrganizationId.set(null);
    this.removeStoredOrganizationId();
  }

  private readStoredOrganizationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persistOrganizationId(organizationId: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, organizationId);
    } catch {
      // Ignore storage failures in private browsing or restricted contexts.
    }
  }

  private removeStoredOrganizationId(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures in private browsing or restricted contexts.
    }
  }
}
