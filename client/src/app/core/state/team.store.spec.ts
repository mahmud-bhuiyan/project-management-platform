import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { TeamStore } from './team.store';

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

describe('TeamStore', () => {
  let teamStore: InstanceType<typeof TeamStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        OrganizationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    teamStore = TestBed.inject(TeamStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('addMember patches the members list', async () => {
    const loadPromise = firstValueFrom(
      teamStore.loadMembers({ organizationId: 'org-1' }),
    );

    const listRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    listRequest.flush({
      success: true,
      data: { members: [] },
    });

    await loadPromise;

    const addPromise = firstValueFrom(
      teamStore.addMember({
        organizationId: 'org-1',
        email: 'member@acme.dev',
      }),
    );

    const addRequest = httpMock.expectOne(
      'http://localhost:3001/api/v1/organizations/org-1/members',
    );
    addRequest.flush({
      success: true,
      data: { member },
    });

    await addPromise;

    expect(teamStore.members()).toHaveLength(1);
    expect(teamStore.members()[0].user.email).toBe('member@acme.dev');
  });
});
