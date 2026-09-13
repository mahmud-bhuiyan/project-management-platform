export type DataTablePageToken = number | 'ellipsis';

export function buildPageTokens(
  currentPage: number,
  totalPages: number,
): DataTablePageToken[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
    2,
    totalPages - 1,
  ]);

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const tokens: DataTablePageToken[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      tokens.push('ellipsis');
    }

    tokens.push(sorted[index]);
  }

  return tokens;
}
