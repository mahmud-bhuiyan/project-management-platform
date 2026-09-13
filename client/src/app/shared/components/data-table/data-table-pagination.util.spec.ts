import { buildPageTokens } from './data-table-pagination.util';

describe('buildPageTokens', () => {
  it('returns all pages when total pages is small', () => {
    expect(buildPageTokens(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('inserts ellipsis for large page counts', () => {
    expect(buildPageTokens(6, 11)).toEqual([
      1,
      2,
      'ellipsis',
      5,
      6,
      7,
      'ellipsis',
      10,
      11,
    ]);
  });
});
