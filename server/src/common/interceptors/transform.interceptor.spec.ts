import { HttpStatus } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TransformInterceptor } from './transform.interceptor.js';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps plain data', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () => of({ status: 'ok' }),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: { status: 'ok' },
    });
  });

  it('wraps controller responses with message and meta', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            message: 'User updated successfully',
            data: { id: 1, name: 'Jane D.' },
          }),
      }),
    );

    expect(result).toEqual({
      success: true,
      message: 'User updated successfully',
      data: { id: 1, name: 'Jane D.' },
    });
  });

  it('wraps paginated controller responses', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of({
            data: [{ id: 1 }],
            meta: { page: 1, perPage: 10, total: 42, totalPages: 5 },
          }),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: [{ id: 1 }],
      meta: { page: 1, perPage: 10, total: 42, totalPages: 5 },
    });
  });

  it('wraps undefined as null data', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () => of(undefined),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: null,
    });
  });
});
