import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { OrganizationStore } from './organization.store';

const organizations = [
  {
    id: 'org-1',
    name: 'Acme Technologies',
    slug: 'acme',
    role: 'OWNER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'org-2',
    name: 'Beta Labs',
    slug: 'beta',
    role: 'ADMIN' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('OrganizationStore', () => {
  let organizationStore: InstanceType<typeof OrganizationStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        OrganizationStore,
        OrganizationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    organizationStore = TestBed.inject(OrganizationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loadOrganizations stores organizations and active org', async () => {
    const loadPromise = firstValueFrom(
      organizationStore.loadOrganizations(),
    );

    const request = httpMock.expectOne('http://localhost:3001/api/v1/organizations');
    request.flush({
      success: true,
      data: { organizations },
    });

    await expect(loadPromise).resolves.toEqual(organizations);
    expect(organizationStore.organizations()).toEqual(organizations);
    expect(organizationStore.activeOrganizationId()).toBe('org-1');
  });

  it('setActiveOrganization updates active org id', () => {
    organizationStore.setActiveOrganization('org-2');

    expect(organizationStore.activeOrganizationId()).toBe('org-2');
    expect(localStorage.getItem('flowdesk:activeOrganizationId')).toBe('org-2');
  });
});
