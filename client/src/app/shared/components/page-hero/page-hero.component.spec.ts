import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeroComponent } from './page-hero.component';

describe('PageHeroComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeroComponent],
    }).compileComponents();
  });

  it('renders title and description in a compact bar', () => {
    const fixture = TestBed.createComponent(PageHeroComponent);
    fixture.componentRef.setInput('title', 'Team members');
    fixture.componentRef.setInput(
      'description',
      'Manage who has access to this organization.',
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Team members');
    expect(compiled.textContent).toContain(
      'Manage who has access to this organization.',
    );
    expect(compiled.querySelector('.page-hero')).toBeTruthy();
    expect(compiled.querySelector('.page-hero__glow')).toBeTruthy();
    expect(compiled.querySelector('.page-hero__meta')).toBeTruthy();
  });

  it('supports projected description and badge content', () => {
    @Component({
      imports: [PageHeroComponent],
      template: `
        <app-page-hero title="Projects">
          <p pageHeroDescription>Track delivery across teams.</p>
          <span pageHeroBadge>12 active</span>
        </app-page-hero>
      `,
    })
    class HostComponent {}

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Track delivery across teams.');
    expect(compiled.textContent).toContain('12 active');
  });
});
