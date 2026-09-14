import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/services/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
  });

  it('renders active toasts from the toast service', () => {
    toastService.success('Saved successfully.');

    const fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Saved successfully.');
    expect(compiled.querySelector('[data-testid="toast-success"]')).toBeTruthy();
  });
});
