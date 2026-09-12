import { describe, expect, it } from 'vitest';
import { buildErrorResponse, buildSuccessResponse, respond } from './api-response.util.js';

describe('api-response.util', () => {
  it('buildSuccessResponse wraps data', () => {
    expect(buildSuccessResponse({ id: 1 })).toEqual({
      success: true,
      data: { id: 1 },
    });
  });

  it('buildSuccessResponse supports message and meta', () => {
    expect(
      buildSuccessResponse([{ id: 1 }], {
        message: 'Users fetched successfully',
        meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
      }),
    ).toEqual({
      success: true,
      message: 'Users fetched successfully',
      data: [{ id: 1 }],
      meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    });
  });

  it('buildErrorResponse matches API error shape', () => {
    expect(buildErrorResponse('User not found', 'USER_NOT_FOUND')).toEqual({
      success: false,
      message: 'User not found',
      error: { code: 'USER_NOT_FOUND', details: null },
    });
  });

  it('respond helpers return controller payloads', () => {
    expect(respond.created({ id: 1 }, 'User created successfully')).toEqual({
      message: 'User created successfully',
      data: { id: 1 },
    });

    expect(respond.deleted('User deleted successfully')).toEqual({
      message: 'User deleted successfully',
      data: null,
    });
  });
});
