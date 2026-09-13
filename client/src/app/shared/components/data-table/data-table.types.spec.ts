import {
  DEFAULT_DATA_TABLE_CONFIG,
  resolveDataTableConfig,
} from './data-table.types';

describe('resolveDataTableConfig', () => {
  it('returns defaults when config is omitted', () => {
    expect(resolveDataTableConfig()).toEqual(DEFAULT_DATA_TABLE_CONFIG);
  });

  it('merges partial overrides', () => {
    expect(
      resolveDataTableConfig({
        stripedRows: true,
        showColumnBorders: false,
        defaultHeaderAlign: 'left',
      }),
    ).toEqual({
      ...DEFAULT_DATA_TABLE_CONFIG,
      stripedRows: true,
      showColumnBorders: false,
      defaultHeaderAlign: 'left',
    });
  });
});
