import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.items;

  protected dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  protected ariaLive(variant: string): 'assertive' | 'polite' {
    return variant === 'error' ? 'assertive' : 'polite';
  }
}
