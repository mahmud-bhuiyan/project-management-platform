import { describe, expect, it } from 'vitest';
import {
  formatProjectDueDate,
  toDateInputValue,
  projectPriorityBadgeTone,
  projectPriorityLabel,
  projectStatusBadgeTone,
  projectStatusLabel,
} from './project.util';

describe('project.util', () => {
  it('maps project status labels and badge tones', () => {
    expect(projectStatusLabel('PLANNING')).toBe('Planning');
    expect(projectStatusLabel('ACTIVE')).toBe('Active');
    expect(projectStatusBadgeTone('ON_HOLD')).toBe('warning');
    expect(projectStatusBadgeTone('ARCHIVED')).toBe('muted');
  });

  it('maps project priority labels and badge tones', () => {
    expect(projectPriorityLabel('CRITICAL')).toBe('Critical');
    expect(projectPriorityBadgeTone('LOW')).toBe('muted');
    expect(projectPriorityBadgeTone('HIGH')).toBe('warning');
  });

  it('formats due dates for display', () => {
    expect(formatProjectDueDate(null)).toBeNull();
    expect(formatProjectDueDate('invalid')).toBeNull();
    expect(formatProjectDueDate('2026-03-15T00:00:00.000Z')).toMatch(/Mar/);
  });

  it('converts API dates to date input values', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue('invalid')).toBe('');
    expect(toDateInputValue('2026-03-15T00:00:00.000Z')).toBe('2026-03-15');
  });
});
