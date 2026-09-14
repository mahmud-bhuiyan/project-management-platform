import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a success toast', () => {
    service.success('Saved.');

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0]).toMatchObject({
      message: 'Saved.',
      variant: 'success',
    });
  });

  it('adds an error toast', () => {
    service.error('Failed.');

    expect(service.items()[0].variant).toBe('error');
  });

  it('dismisses a toast by id', () => {
    service.success('One');
    const id = service.items()[0].id;

    service.dismiss(id);

    expect(service.items()).toHaveLength(0);
  });

  it('auto-dismisses toasts after the default duration', () => {
    service.info('Temporary');

    expect(service.items()).toHaveLength(1);

    vi.advanceTimersByTime(4_000);

    expect(service.items()).toHaveLength(0);
  });
});
