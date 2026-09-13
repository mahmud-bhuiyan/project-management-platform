import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '../../interceptors/auth.interceptor';
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
  {
    id: 'org-2',
    name: 'Second Workspace',
    slug: 'second-workspace',
    role: 'OWNER' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    organizationService = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads organizations and selects the first when none is stored', async () => {
    const loadPromise = firstValueFrom(organizationService.loadOrganizations());

    const request = httpMock.expectOne('http://localhost:3001/api/v1/organizations');
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: { organizations },
    });

    const result = await loadPromise;

    expect(result).toEqual(organizations);
    expect(organizationService.organizations()).toEqual(organizations);
    expect(organizationService.activeOrganizationId()).toBe('org-1');
    expect(organizationService.activeOrganization()?.name).toBe('Acme Technologies');
  });

  it('restores the stored active organization after reload', async () => {
    localStorage.setItem('flowdesk:activeOrganizationId', 'org-2');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    organizationService = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);

    const loadPromise = firstValueFrom(organizationService.loadOrganizations());

    httpMock
      .expectOne('http://localhost:3001/api/v1/organizations')
      .flush({
        success: true,
        data: { organizations },
      });

    await loadPromise;

    expect(organizationService.activeOrganizationId()).toBe('org-2');
    expect(organizationService.activeOrganization()?.name).toBe('Second Workspace');
  });

  it('persists active organization selection to localStorage', () => {
    organizationService.organizations.set(organizations);
    organizationService.setActiveOrganization('org-2');

    expect(organizationService.activeOrganizationId()).toBe('org-2');
    expect(localStorage.getItem('flowdesk:activeOrganizationId')).toBe('org-2');
  });

  it('loads organization members', async () => {
    const members = [
      {
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'OWNER' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user-1',
          email: 'admin@acme.dev',
          name: 'Acme Admin',
          platformRole: 'USER' as const,
          avatarUrl: null,
          themePreference: 'LIGHT' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ];

    const loadPromise = firstValueFrom(
      organizationService.loadMembers('org-1'),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: { members },
    });

    await expect(loadPromise).resolves.toEqual(members);
  });

  it('adds, updates, and removes organization members', async () => {
    const member = {
      id: 'member-2',
      organizationId: 'org-1',
      userId: 'user-2',
      role: 'MEMBER' as const,
      createdAt: '2026-01-02T00:00:00.000Z',
      user: {
        id: 'user-2',
        email: 'member@acme.dev',
        name: 'Team Member',
        platformRole: 'USER' as const,
        avatarUrl: null,
        themePreference: 'LIGHT' as const,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    };

    const addPromise = firstValueFrom(
      organizationService.addMember('org-1', {
        email: 'member@acme.dev',
        role: 'MEMBER',
      }),
    );
    httpMock
      .expectOne('http://localhost:3001/api/v1/organizations/org-1/members')
      .flush({ success: true, data: { member } });
    await expect(addPromise).resolves.toEqual(member);

    const updatedMember = { ...member, role: 'ADMIN' as const };
    const updatePromise = firstValueFrom(
      organizationService.updateMemberRole('org-1', 'member-2', 'ADMIN'),
    );
    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/members/member-2',
      )
      .flush({ success: true, data: { member: updatedMember } });
    await expect(updatePromise).resolves.toEqual(updatedMember);

    const removePromise = firstValueFrom(
      organizationService.removeMember('org-1', 'member-2'),
    );
    httpMock
      .expectOne(
        'http://localhost:3001/api/v1/organizations/org-1/members/member-2',
      )
      .flush({ success: true, data: null });
    await expect(removePromise).resolves.toBeUndefined();
  });

  it('clears organizations and storage', () => {
    organizationService.organizations.set(organizations);
    organizationService.setActiveOrganization('org-2');

    organizationService.clear();

    expect(organizationService.organizations()).toEqual([]);
    expect(organizationService.activeOrganizationId()).toBeNull();
    expect(localStorage.getItem('flowdesk:activeOrganizationId')).toBeNull();
  });
});
