import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from './organization.service';

const organizations = [
  {
    id: 'org-1',
    name: 'Acme Technologies',
    slug: 'acme',
    role: 'OWNER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    organizationService = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listOrganizations returns organizations', async () => {
    const listPromise = firstValueFrom(organizationService.listOrganizations());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/organizations');
    request.flush({
      success: true,
      data: { organizations },
    });

    await expect(listPromise).resolves.toEqual(organizations);
  });

  it('loadMembers returns organization members', async () => {
    const membersPromise = firstValueFrom(
      organizationService.loadMembers('org-1'),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    request.flush({
      success: true,
      data: { members: [] },
    });

    await expect(membersPromise).resolves.toEqual([]);
  });
});
