const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 80;

export function slugifyOrganizationName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_SLUG_LENGTH);

  return slug.length > 0 ? slug : 'organization';
}

export function isValidOrganizationSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

export function appendSlugSuffix(baseSlug: string, suffix: number): string {
  const suffixText = `-${suffix}`;
  const trimmedBase = baseSlug.slice(0, MAX_SLUG_LENGTH - suffixText.length);
  return `${trimmedBase}${suffixText}`;
}
