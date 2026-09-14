import { buildApiUrl } from './api-prefix';

describe('buildApiUrl', () => {
  it('appends /api/v1 to the server origin', () => {
    expect(buildApiUrl('http://localhost:3001')).toBe('http://localhost:3001/api/v1');
  });

  it('trims trailing slashes before appending the prefix', () => {
    expect(buildApiUrl('http://localhost:3001/')).toBe('http://localhost:3001/api/v1');
  });

  it('leaves URLs unchanged when the prefix is already present', () => {
    expect(buildApiUrl('http://localhost:3001/api/v1')).toBe('http://localhost:3001/api/v1');
  });
});
