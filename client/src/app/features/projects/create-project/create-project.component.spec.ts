import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { Organization } from '../../../core/models/organization.model';
import type { ProjectSummary } from '../../../core/models/project.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { CreateProjectComponent } from './create-project.component';

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const project: ProjectSummary = {
  id: 'project-2',
  organizationId: 'org-1',
  name: 'Mobile Application',
  description: 'Build the companion app.',
  status: 'PLANNING',
  priority: 'MEDIUM',
  ownerId: 'user-1',
  startDate: null,
  dueDate: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owner: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('CreateProjectComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const projectsStore = {
    createProject: vi.fn(() => of(project)),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    projectsStore.createProject = vi.fn(() => of(project));

    await TestBed.configureTestingModule({
      imports: [CreateProjectComponent],
      providers: [
        provideRouter([{ path: 'projects', component: CreateProjectComponent }]),
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: ProjectsStore, useValue: projectsStore },
      ],
    }).compileComponents();
  });

  it('creates a project and navigates back to the list', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CreateProjectComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="project-form-name"]',
    );
    const descriptionInput = compiled.querySelector<HTMLTextAreaElement>(
      '[data-testid="project-form-description"]',
    );
    nameInput!.value = 'Mobile Application';
    nameInput!.dispatchEvent(new Event('input'));
    descriptionInput!.value = 'Build the companion app.';
    descriptionInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(projectsStore.createProject).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        name: 'Mobile Application',
        description: 'Build the companion app.',
        status: 'PLANNING',
        priority: 'MEDIUM',
      },
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
  });

  it('shows API errors on the page form', () => {
    projectsStore.createProject = vi.fn(() =>
      throwError(() => ({
        error: { message: 'Duplicate project name' },
      })),
    );

    const fixture = TestBed.createComponent(CreateProjectComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector<HTMLInputElement>(
      '[data-testid="project-form-name"]',
    );
    nameInput!.value = 'Website Redesign';
    nameInput!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.project-form')?.requestSubmit();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Duplicate project name');
  });
});
