import { describe, expect, it } from 'vitest';
import { normalizeSocketUrl } from './socket-url.util';

describe('normalizeSocketUrl', () => {
  it('converts ws:// to http://', () => {
    expect(normalizeSocketUrl('ws://localhost:3001')).toBe(
      'http://localhost:3001',
    );
  });

  it('converts wss:// to https://', () => {
    expect(normalizeSocketUrl('wss://api.example.com')).toBe(
      'https://api.example.com',
    );
  });

  it('leaves http URLs unchanged', () => {
    expect(normalizeSocketUrl('http://localhost:3001')).toBe(
      'http://localhost:3001',
    );
  });
});
