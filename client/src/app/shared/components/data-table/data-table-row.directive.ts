import { Directive, TemplateRef } from '@angular/core';

export interface DataTableRowContext<T> {
  $implicit: T;
  item: T;
  columnCellClass: (columnId: string) => string;
}

@Directive({
  selector: 'ng-template[appDataTableRow]',
})
export class DataTableRowDirective<T = unknown> {
  constructor(
    readonly templateRef: TemplateRef<DataTableRowContext<T>>,
  ) {}
}
