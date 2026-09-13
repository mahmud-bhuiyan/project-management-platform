import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProjectSummary } from '../../../core/models/project.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ProjectCardComponent } from './project-card.component';

const sampleProject: ProjectSummary = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description:
    'Refresh marketing site UX with updated brand guidelines, improved conversion paths across landing pages, and a refreshed component library for the public site.',
  status: 'ACTIVE',
  priority: 'HIGH',
  ownerId: 'user-1',
  startDate: null,
  dueDate: '2026-04-01T00:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
  owner: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('ProjectCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders project summary with badges and due date', () => {
    const fixture = TestBed.createComponent(ProjectCardComponent);
    fixture.componentRef.setInput('project', sampleProject);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="project-card-project-1"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Website Redesign');
    expect(compiled.textContent).toContain('Acme Admin');
    expect(compiled.textContent).toContain('Active');
    expect(compiled.textContent).toContain('High');
    expect(compiled.textContent).toContain('Due');
    expect(compiled.textContent).toContain('…');
  });

  it('renders an edit button when editable', () => {
    const fixture = TestBed.createComponent(ProjectCardComponent);
    fixture.componentRef.setInput('project', sampleProject);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="project-edit-project-1"]')).toBeTruthy();
  });

  it('renders as a router link when link input is provided', () => {
    const fixture = TestBed.createComponent(ProjectCardComponent);
    fixture.componentRef.setInput('project', sampleProject);
    fixture.componentRef.setInput('link', ['/projects', 'project-1']);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a.project-card--interactive');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('/projects/project-1');
  });
});

describe('Projects list shared components', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a project card grid for list layouts', () => {
    @Component({
      imports: [ProjectCardComponent],
      template: `
        <section class="projects-grid">
          <app-project-card [project]="project" [link]="['/projects', project.id]" />
        </section>
      `,
    })
    class ProjectsGridHostComponent {
      project = sampleProject;
    }

    const fixture = TestBed.createComponent(ProjectsGridHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="project-card-project-1"]')).toBeTruthy();
  });

  it('renders an empty state when no projects exist', () => {
    @Component({
      imports: [EmptyStateComponent],
      template: `
        <app-empty-state
          title="No projects yet"
          description="Create your first project to start tracking delivery."
          testId="projects-empty"
        />
      `,
    })
    class ProjectsEmptyHostComponent {}

    const fixture = TestBed.createComponent(ProjectsEmptyHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="projects-empty"]')).toBeTruthy();
  });
});
