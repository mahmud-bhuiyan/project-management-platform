import { describe, expect, it } from 'vitest';
import {
  extractMentionHandles,
  resolveMentionedUserIds,
} from './mention.util.js';

describe('mention.util', () => {
  const members = [
    {
      userId: 'user-admin',
      email: 'admin@acme.dev',
      name: 'Acme Admin',
    },
    {
      userId: 'user-manager',
      email: 'manager@acme.dev',
      name: 'Project Manager',
    },
  ];

  it('extracts unique mention handles from a comment body', () => {
    expect(
      extractMentionHandles(
        'Looks good — please loop in @manager for review. cc @manager',
      ),
    ).toEqual(['manager']);
  });

  it('resolves mentions by email local part', () => {
    expect(
      resolveMentionedUserIds(['manager'], members, 'user-admin'),
    ).toEqual(['user-manager']);
  });

  it('excludes the comment author from mention notifications', () => {
    expect(
      resolveMentionedUserIds(['admin'], members, 'user-admin'),
    ).toEqual([]);
  });
});
