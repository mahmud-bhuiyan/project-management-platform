import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Organization } from '../../core/models/organization.model';
import { OrganizationStore } from '../../core/state/organization.store';
import { OrganizationSettingsComponent } from './organization-settings.component';

const organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('OrganizationSettingsComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
    updateOrganization: vi.fn(),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    organizationStore.updateOrganization.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [OrganizationSettingsComponent],
      providers: [{ provide: OrganizationStore, useValue: organizationStore }],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    organizationStore.updateOrganization.mockReturnValue(of(undefined));
  });

  it('renders organization details for managers', async () => {
    const fixture = TestBed.createComponent(OrganizationSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acme Technologies');
    expect(compiled.querySelector('[data-testid="org-settings-save"]')).toBeTruthy();
  });

  it('shows read-only UI for viewers', async () => {
    organizationStore.activeOrganization = signal<Organization | null>({
      ...organization,
      role: 'VIEWER',
    });

    const fixture = TestBed.createComponent(OrganizationSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('read-only');
    expect(compiled.querySelector('[data-testid="org-settings-save"]')).toBeNull();

    const nameInput = compiled.querySelector(
      '[data-testid="org-settings-name"]',
    ) as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
  });

  it('submits an organization name update', async () => {
    const fixture = TestBed.createComponent(OrganizationSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['settingsForm'].setValue({ name: 'Acme Corp' });
    component['submit']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(organizationStore.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: 'Acme Corp',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Organization name updated.',
    );
  });

  it('shows an error when update fails', async () => {
    organizationStore.updateOrganization.mockReturnValue(
      throwError(() => ({
        error: { message: 'Insufficient organization permissions' },
      })),
    );

    const fixture = TestBed.createComponent(OrganizationSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['settingsForm'].setValue({ name: 'Acme Corp' });
    component['submit']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Insufficient organization permissions',
    );
  });
});
