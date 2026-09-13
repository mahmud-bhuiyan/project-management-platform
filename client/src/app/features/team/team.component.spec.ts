import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { Organization } from '../../core/models/organization.model';
import { OrganizationStore } from '../../core/state/organization.store';
import { TeamStore } from '../../core/state/team.store';
import { TeamComponent } from './team.component';

const organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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
  {
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
  },
];

describe('TeamComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const teamStore = {
    members: signal(members),
    membersError: signal<string | null>(null),
    isLoading: signal(false),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    teamStore.members = signal(members);
    teamStore.membersError = signal<string | null>(null);
    teamStore.isLoading = signal(false);
    teamStore.addMember.mockReturnValue(of(members[1]));
    teamStore.updateMemberRole.mockReturnValue(of(members[1]));
    teamStore.removeMember.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [TeamComponent],
      providers: [
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: TeamStore, useValue: teamStore },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    teamStore.addMember.mockReturnValue(of(members[1]));
  });

  it('displays organization members from the store', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acme Admin');
    expect(compiled.textContent).toContain('member@acme.dev');
    expect(compiled.querySelector('[data-testid="team-member-table"]')).toBeTruthy();
  });

  it('shows add member controls for managers', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="team-open-add-member"]',
      ),
    ).toBeTruthy();
  });

  it('shows a members error from the store', async () => {
    teamStore.membersError = signal('Organization not found');

    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Organization not found',
    );
  });

  it('opens the view user modal with member details', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const viewButton = fixture.nativeElement.querySelector(
      '[data-testid="team-view-member"]',
    ) as HTMLButtonElement;
    viewButton.click();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Team member');
    expect(compiled.textContent).toContain('admin@acme.dev');
    expect(compiled.textContent).toContain('Organization role');
  });

  it('requires confirmation before removing a member', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const removeButtons = fixture.nativeElement.querySelectorAll(
      '[data-testid="team-remove-member"]',
    ) as NodeListOf<HTMLButtonElement>;
    removeButtons[1].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Remove team member?');
    expect(teamStore.removeMember).not.toHaveBeenCalled();

    const confirmButton = fixture.nativeElement.querySelector(
      '[data-testid="team-remove-confirm"]',
    ) as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();

    expect(teamStore.removeMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-2',
    });
  });
});
