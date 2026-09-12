import { Component, forwardRef, input, output, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-password-input',
  imports: [ReactiveFormsModule],
  templateUrl: './password-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInputComponent),
      multi: true,
    },
  ],
})
export class PasswordInputComponent implements ControlValueAccessor {
  readonly inputId = input('password');
  readonly placeholder = input('Enter your password');
  readonly autocomplete = input('current-password');
  readonly valueInput = output<void>();

  protected readonly showPassword = signal(false);
  protected value = '';
  protected disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onInput(value: string): void {
    this.value = value;
    this.onChange(value);
    this.valueInput.emit();
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected toggleVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }
}
