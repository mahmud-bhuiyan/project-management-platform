import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from './password.util.js';

describe('password.util', () => {
  it('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('secret-password');

    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toBe('secret-password');
  });

  it('comparePassword returns true for matching password', async () => {
    const hash = await hashPassword('secret-password');

    await expect(comparePassword('secret-password', hash)).resolves.toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const hash = await hashPassword('secret-password');

    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });
});
