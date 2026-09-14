import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import type { Organization } from '../core/models/organization.model';
import { OrganizationStore } from '../core/state/organization.store';
import { projectManagerGuard } from './project-manager.guard';

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('projectManagerGuard', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  beforeEach(() => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OrganizationStore, useValue: organizationStore },
      ],
    });
  });

  it('allows OWNER and ADMIN roles', () => {
    const result = TestBed.runInInjectionContext(() => projectManagerGuard(null!, null!));
    expect(result).toBe(true);
  });

  it('redirects viewers to the unauthorized page', () => {
    organizationStore.activeOrganization = signal<Organization | null>({
      ...organization,
      role: 'VIEWER',
    });

    const result = TestBed.runInInjectionContext(() => projectManagerGuard(null!, null!));
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/unauthorized');
  });
});
