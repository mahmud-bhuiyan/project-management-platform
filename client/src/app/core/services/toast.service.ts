import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

const DEFAULT_DURATION_MS = 4_000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<ToastMessage[]>([]);

  readonly items = this.toasts.asReadonly();

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: string): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private show(message: string, variant: ToastVariant): void {
    const id = crypto.randomUUID();

    this.toasts.update((items) => [...items, { id, message, variant }]);

    window.setTimeout(() => this.dismiss(id), DEFAULT_DURATION_MS);
  }
}
