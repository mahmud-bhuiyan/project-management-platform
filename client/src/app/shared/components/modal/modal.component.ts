import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly isOpen = input(false);
  readonly title = input('');
  readonly description = input<string | null>(null);
  readonly closeOnBackdrop = input(true);

  readonly closed = output<void>();

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop()) {
      return;
    }

    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
