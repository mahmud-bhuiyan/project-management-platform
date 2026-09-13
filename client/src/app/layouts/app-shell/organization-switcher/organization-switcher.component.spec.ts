import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationStore } from '../../../core/state/organization.store';
import { WorkspaceStore } from '../../../core/state/workspace.store';
import { OrganizationSwitcherComponent } from './organization-switcher.component';

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

describe('OrganizationSwitcherComponent', () => {
  const organizationStore = {
    organizations: signal(organizations),
    activeOrganization: signal(organizations[0]),
    activeOrganizationId: signal('org-1'),
    isLoading: signal(false),
    loadOrganizations: vi.fn(() => of(organizations)),
    setActiveOrganization: vi.fn(),
  };

  const workspaceStore = {
    reloadForActiveOrganization: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    organizationStore.organizations = signal(organizations);
    organizationStore.activeOrganization = signal(organizations[0]);
    organizationStore.activeOrganizationId = signal('org-1');
    organizationStore.isLoading = signal(false);

    await TestBed.configureTestingModule({
      imports: [OrganizationSwitcherComponent],
      providers: [
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: WorkspaceStore, useValue: workspaceStore },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceStore.reloadForActiveOrganization.mockReturnValue(of(undefined));
  });

  it('renders the active organization name', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acme Technologies');
  });

  it('switches the active organization from the menu', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherComponent);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="organization-switcher-trigger"]',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll(
      '.org-switcher__option',
    );
    expect(options.length).toBe(2);

    (options[1] as HTMLButtonElement).click();

    expect(organizationStore.setActiveOrganization).toHaveBeenCalledWith('org-2');
    expect(workspaceStore.reloadForActiveOrganization).toHaveBeenCalled();
  });

  it('opens immediately from cached state and refreshes in the background', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherComponent);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="organization-switcher-trigger"]',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.org-switcher__option').length).toBe(2);
    expect(organizationStore.loadOrganizations).toHaveBeenCalledWith({ silent: true });
  });
});
