export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn {
  id: string;
  label: string;
  /** Applies to both header and cells when headerAlign/cellAlign are omitted. */
  align?: DataTableAlign;
  /** Falls back to `DataTableConfig.defaultHeaderAlign` when omitted. */
  headerAlign?: DataTableAlign;
  /** Falls back to `DataTableConfig.defaultCellAlign` when omitted. */
  cellAlign?: DataTableAlign;
  /** CSS width value, e.g. `25%` or `12rem`. Prefer `widthPercent`. */
  width?: string;
  /** Column width as a percentage of the table, e.g. `25` → `25%`. */
  widthPercent?: number;
}

export interface DataTablePageSummary {
  start: number;
  end: number;
  total: number;
}

/** Optional table appearance and pagination settings. All fields have defaults. */
export interface DataTableConfig {
  /** Default rows shown per page. Parent still owns live `pageSize` state. */
  pageSize: number;
  /** Options shown in the rows-per-page selector. */
  pageSizeOptions: number[];
  /** Default header alignment when a column does not specify one. */
  defaultHeaderAlign: DataTableAlign;
  /** Default cell alignment when a column does not specify one. */
  defaultCellAlign: DataTableAlign;
  /** Draw vertical borders between columns. */
  showColumnBorders: boolean;
  /** Alternate background color on even rows. */
  stripedRows: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export const DEFAULT_DATA_TABLE_CONFIG: DataTableConfig = {
  pageSize: DEFAULT_PAGE_SIZE,
  pageSizeOptions: [...DEFAULT_PAGE_SIZE_OPTIONS],
  defaultHeaderAlign: 'center',
  defaultCellAlign: 'center',
  showColumnBorders: false,
  stripedRows: false,
};

export function resolveDataTableConfig(
  config?: Partial<DataTableConfig>,
): DataTableConfig {
  return {
    ...DEFAULT_DATA_TABLE_CONFIG,
    ...config,
  };
}
