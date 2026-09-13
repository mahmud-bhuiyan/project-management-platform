import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import { buildPageTokens } from './data-table-pagination.util';
import { DataTableRowDirective } from './data-table-row.directive';
import type {
  DataTableAlign,
  DataTableColumn,
  DataTableConfig,
  DataTablePageSummary,
} from './data-table.types';
import { resolveDataTableConfig } from './data-table.types';

@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly columns = input.required<DataTableColumn[]>();
  readonly items = input<readonly unknown[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly totalCount = input(0);
  readonly filteredCount = input(0);
  readonly emptyMessage = input('No items yet.');
  readonly noResultsMessage = input('No items match your search.');
  readonly loadingMessage = input('Loading…');
  readonly showSearch = input(true);
  readonly searchValue = input('');
  readonly searchPlaceholder = input('Search…');
  readonly searchInputId = input('data-table-search');
  readonly searchTestId = input<string | null>(null);
  readonly tableTestId = input<string | null>(null);
  readonly rowTestId = input<string | null>(null);
  readonly pageSummary = input<DataTablePageSummary>({
    start: 0,
    end: 0,
    total: 0,
  });
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly pageSize = input<number | null>(null);
  readonly itemLabel = input('item');
  readonly pageFirstTestId = input<string | null>(null);
  readonly pagePreviousTestId = input<string | null>(null);
  readonly pageNextTestId = input<string | null>(null);
  readonly pageLastTestId = input<string | null>(null);
  readonly pageSizeTestId = input<string | null>(null);
  readonly trackBy = input<(item: unknown, index: number) => unknown>(
    (item, index) => defaultTrackBy(item, index),
  );
  /** Optional table configuration. Unset fields use `DEFAULT_DATA_TABLE_CONFIG`. */
  readonly config = input<Partial<DataTableConfig>>({});

  readonly searchChange = output<string>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly rowTemplate =
    contentChild.required(DataTableRowDirective);

  protected readonly tableConfig = computed(() =>
    resolveDataTableConfig(this.config()),
  );

  protected readonly tableClass = computed(() => {
    const { showColumnBorders, stripedRows } = this.tableConfig();
    const classes = ['data-table', 'w-full', 'table-fixed'];

    if (showColumnBorders) {
      classes.push('data-table--bordered', 'border-collapse');
    } else {
      classes.push('border-separate');
    }

    if (stripedRows) {
      classes.push('data-table--striped');
    }

    return classes.join(' ');
  });

  protected readonly effectivePageSize = computed(
    () => this.pageSize() ?? this.tableConfig().pageSize,
  );

  protected readonly pageSizeOptions = computed(
    () => this.tableConfig().pageSizeOptions,
  );

  protected readonly pageTokens = computed(() =>
    buildPageTokens(this.currentPage(), this.totalPages()),
  );

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  protected onPageSizeSelect(event: Event): void {
    const value = Number.parseInt((event.target as HTMLSelectElement).value, 10);
    if (!Number.isNaN(value)) {
      this.pageSizeChange.emit(value);
    }
  }

  protected goToPage(page: number): void {
    const totalPages = this.totalPages();
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    if (nextPage !== this.currentPage()) {
      this.pageChange.emit(nextPage);
    }
  }

  protected columnWidth(column: DataTableColumn): string | null {
    if (column.width) {
      return column.width;
    }

    if (column.widthPercent != null) {
      return `${column.widthPercent}%`;
    }

    return null;
  }

  protected columnHeaderClass(column: DataTableColumn): string {
    const config = this.tableConfig();
    const align = column.headerAlign ?? column.align ?? config.defaultHeaderAlign;
    const parts = [
      'py-3.5 px-4 text-xs font-semibold tracking-[0.04em] uppercase text-gray-500 whitespace-nowrap bg-flow-100',
      this.alignClass(align),
    ];
    if (config.showColumnBorders) {
      parts.push('border border-flow-200');
    }
    return parts.join(' ');
  }

  protected columnCellClass(columnId: string, rowIndex = 0): string {
    const config = this.tableConfig();
    const cols = this.columns();
    const column = cols.find((entry) => entry.id === columnId);
    const align = column?.cellAlign ?? column?.align ?? config.defaultCellAlign;

    const bg =
      config.stripedRows && rowIndex % 2 === 1
        ? 'bg-flow-50/95'
        : 'bg-[rgb(250_250_255/0.75)]';

    const parts = [
      'py-3 px-5 align-middle text-sm text-gray-700',
      bg,
      this.alignClass(align),
    ];

    if (config.showColumnBorders) {
      parts.push('border border-flow-200');
    } else {
      const idx = cols.findIndex((c) => c.id === columnId);
      if (idx === 0) parts.push('rounded-l-xl');
      if (idx === cols.length - 1) parts.push('rounded-r-xl');
    }

    return parts.join(' ');
  }

  protected buildRowContext(item: unknown, rowIndex: number) {
    return {
      $implicit: item,
      item,
      columnCellClass: (columnId: string) => this.columnCellClass(columnId, rowIndex),
    };
  }

  protected itemLabelPlural(count: number): string {
    return count === 1 ? this.itemLabel() : `${this.itemLabel()}s`;
  }

  private alignClass(align: DataTableAlign): string {
    const map: Record<DataTableAlign, string> = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };
    return map[align];
  }
}

function defaultTrackBy(item: unknown, index: number): unknown {
  if (item && typeof item === 'object' && 'id' in item) {
    return (item as { id: unknown }).id;
  }

  return index;
}
