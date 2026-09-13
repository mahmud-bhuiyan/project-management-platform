import { HttpStatus } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TransformInterceptor } from './transform.interceptor.js';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();
  const httpContext = { getType: () => 'http' } as never;

  it('wraps plain data', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(httpContext, {
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
      interceptor.intercept(httpContext, {
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
      interceptor.intercept(httpContext, {
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

  it('passes through websocket handler responses unchanged', async () => {
    const payload = { ok: true, room: 'project:project-1' };

    const result = await lastValueFrom(
      interceptor.intercept(
        { getType: () => 'ws' } as never,
        {
          handle: () => of(payload),
        },
      ),
    );

    expect(result).toEqual(payload);
  });

  it('wraps undefined as null data', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(httpContext, {
        handle: () => of(undefined),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: null,
    });
  });
});
