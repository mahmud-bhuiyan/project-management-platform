import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '../../../core/services/organization.service';
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
  const organizationService = {
    organizations: signal(organizations),
    activeOrganization: signal(organizations[0]),
    activeOrganizationId: signal('org-1'),
    isLoading: signal(false),
    loadOrganizations: vi.fn(() => of(organizations)),
    setActiveOrganization: vi.fn(),
  };

  beforeEach(async () => {
    organizationService.organizations = signal(organizations);
    organizationService.activeOrganization = signal(organizations[0]);
    organizationService.activeOrganizationId = signal('org-1');
    organizationService.isLoading = signal(false);

    await TestBed.configureTestingModule({
      imports: [OrganizationSwitcherComponent],
      providers: [{ provide: OrganizationService, useValue: organizationService }],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(organizationService.setActiveOrganization).toHaveBeenCalledWith('org-2');
  });

  it('refreshes organizations when opening the menu', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherComponent);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="organization-switcher-trigger"]',
    ) as HTMLButtonElement;
    trigger.click();

    expect(organizationService.loadOrganizations).toHaveBeenCalled();
  });
});
