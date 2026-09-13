/** Socket.IO expects an HTTP(S) origin; env may use ws(s):// for deploy docs. */
export function normalizeSocketUrl(url: string): string {
  return url
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://');
}
