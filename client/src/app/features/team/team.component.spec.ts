import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Organization } from '../../core/models/organization.model';
import { OrganizationService } from '../../core/services/organization.service';
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
  const organizationService = {
    activeOrganization: signal<Organization | null>(organization),
    loadMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  };

  beforeEach(async () => {
    organizationService.activeOrganization = signal<Organization | null>(organization);
    organizationService.loadMembers.mockReturnValue(of(members));

    await TestBed.configureTestingModule({
      imports: [TeamComponent],
      providers: [{ provide: OrganizationService, useValue: organizationService }],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    organizationService.loadMembers.mockReturnValue(of(members));
  });

  it('loads and displays organization members', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(organizationService.loadMembers).toHaveBeenCalledWith('org-1');
    expect(compiled.textContent).toContain('Acme Admin');
    expect(compiled.textContent).toContain('member@acme.dev');
    expect(compiled.querySelector('[data-testid="team-member-table"]')).toBeTruthy();
  });

  it('shows each member role in the role selector', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const selects = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.team-role-select'),
    ) as HTMLSelectElement[];

    expect(selects).toHaveLength(2);
    expect(selects[0].value).toBe('OWNER');
    expect(selects[1].value).toBe('MEMBER');
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

  it('hides management controls for viewers', async () => {
    organizationService.activeOrganization = signal<Organization | null>({
      ...organization,
      role: 'VIEWER',
    });

    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('read-only');
    expect(compiled.querySelector('[data-testid="team-open-add-member"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="team-remove-member"]')).toBeNull();
  });

  it('filters members by search query', async () => {
    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const searchInput = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="team-member-search"]',
    ) as HTMLInputElement;
    searchInput.value = 'member@acme.dev';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="team-member-row"]',
    );
    expect(rows).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Team Member');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Acme Admin');
  });

  it('adds a member from the modal form', async () => {
    const newMember = {
      ...members[1],
      id: 'member-3',
      user: {
        ...members[1].user,
        id: 'user-3',
        email: 'viewer@acme.dev',
        name: 'Viewer User',
      },
      role: 'VIEWER' as const,
    };
    organizationService.addMember.mockReturnValue(of(newMember));

    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['openAddMemberModal']();
    fixture.detectChanges();

    component['addMemberForm'].setValue({
      email: 'viewer@acme.dev',
      role: 'VIEWER',
    });

    component['submitAddMember']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(organizationService.addMember).toHaveBeenCalledWith('org-1', {
      email: 'viewer@acme.dev',
      role: 'VIEWER',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'viewer@acme.dev',
    );
    expect(component['isAddMemberModalOpen']()).toBe(false);
  });

  it('shows a members error when loading fails', async () => {
    organizationService.loadMembers.mockReturnValue(
      throwError(() => ({
        error: { message: 'Organization not found' },
      })),
    );

    const fixture = TestBed.createComponent(TeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Organization not found',
    );
  });
});
