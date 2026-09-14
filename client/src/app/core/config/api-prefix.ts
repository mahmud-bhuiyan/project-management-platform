/** Must match `server/src/common/config/api-prefix.ts`. */
export const API_GLOBAL_PREFIX = 'api/v1';

export function buildApiUrl(serverUrl: string): string {
  const base = serverUrl.replace(/\/+$/, '');
  const suffix = `/${API_GLOBAL_PREFIX}`;

  if (base.endsWith(suffix)) {
    return base;
  }

  return `${base}${suffix}`;
}
