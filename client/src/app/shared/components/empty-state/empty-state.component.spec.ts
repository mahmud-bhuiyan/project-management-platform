import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();
  });

  it('renders title and description', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No projects yet');
    fixture.componentRef.setInput(
      'description',
      'Create your first project to start tracking delivery.',
    );
    fixture.componentRef.setInput('testId', 'projects-empty');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="projects-empty"]')).toBeTruthy();
    expect(compiled.textContent).toContain('No projects yet');
    expect(compiled.textContent).toContain(
      'Create your first project to start tracking delivery.',
    );
  });

  it('supports projected action content', () => {
    @Component({
      imports: [EmptyStateComponent],
      template: `
        <app-empty-state title="No projects yet">
          <button type="button">Create project</button>
        </app-empty-state>
      `,
    })
    class HostComponent {}

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')?.textContent?.trim()).toBe(
      'Create project',
    );
  });
});
