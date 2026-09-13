import { describe, expect, it } from 'vitest';
import {
  appendSlugSuffix,
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from './organization-slug.util.js';

describe('organization-slug.util', () => {
  it('slugifyOrganizationName converts names to kebab-case', () => {
    expect(slugifyOrganizationName('Acme Technologies')).toBe(
      'acme-technologies',
    );
    expect(slugifyOrganizationName('  Hello   World!! ')).toBe('hello-world');
  });

  it('slugifyOrganizationName falls back for empty input', () => {
    expect(slugifyOrganizationName('   ')).toBe('organization');
  });

  it('isValidOrganizationSlug validates slug format', () => {
    expect(isValidOrganizationSlug('acme-technologies')).toBe(true);
    expect(isValidOrganizationSlug('A')).toBe(false);
    expect(isValidOrganizationSlug('invalid slug')).toBe(false);
  });

  it('appendSlugSuffix keeps slug within max length', () => {
    const longSlug = 'a'.repeat(80);
    expect(appendSlugSuffix(longSlug, 2)).toHaveLength(80);
    expect(appendSlugSuffix(longSlug, 2).endsWith('-2')).toBe(true);
  });
});
