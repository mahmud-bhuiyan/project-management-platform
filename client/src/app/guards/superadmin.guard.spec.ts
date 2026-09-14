import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../core/state/auth.store';
import { superadminGuard } from './superadmin.guard';

describe('superadminGuard', () => {
  const authStore = {
    isAuthenticated: vi.fn(() => true),
    isSuperadmin: vi.fn(() => false),
  };

  beforeEach(() => {
    authStore.isAuthenticated.mockReturnValue(true);
    authStore.isSuperadmin.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStore },
      ],
    });
  });

  it('allows superadmin users', () => {
    authStore.isSuperadmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => superadminGuard(null!, null!));
    expect(result).toBe(true);
  });

  it('redirects non-superadmin users to unauthorized', () => {
    const result = TestBed.runInInjectionContext(() => superadminGuard(null!, null!));
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/unauthorized');
  });

  it('redirects unauthenticated users to login', () => {
    authStore.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => superadminGuard(null!, null!));
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
