import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  OrganizationMemberResponseData,
  OrganizationMembersResponseData,
} from '../models/organization-member.model';
import type {
  Organization,
  OrganizationResponseData,
  OrganizationRole,
  OrganizationsResponseData,
} from '../models/organization.model';

/** Thin HTTP facade for organization endpoints — state lives in OrganizationStore / TeamStore. */
@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listOrganizations(): Observable<Organization[]> {
    return this.http
      .get<ApiSuccessResponse<OrganizationsResponseData>>(
        `${this.apiUrl}/organizations`,
      )
      .pipe(map((response) => response.data.organizations));
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

  updateOrganization(organizationId: string, input: { name: string }) {
    return this.http
      .patch<ApiSuccessResponse<OrganizationResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}`,
        input,
      )
      .pipe(map((response) => response.data.organization));
  }
}
