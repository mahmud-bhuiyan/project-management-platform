import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../exceptions/api.exception.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function runFilter(exception: unknown) {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
      }),
    } as never);

    return { status, json };
  }

  it('formats ApiException business errors', () => {
    const { status, json } = runFilter(
      new ApiException(
        'Email already exists',
        'EMAIL_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      ),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Email already exists',
      error: { code: 'EMAIL_ALREADY_EXISTS', details: null },
    });
  });

  it('formats validation errors from array messages', () => {
    const { json } = runFilter(
      new BadRequestException([
        'email must be a valid email address',
        'password must be at least 8 characters',
      ]),
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          'email must be a valid email address',
          'password must be at least 8 characters',
        ],
      },
    });
  });

  it('formats unauthorized errors', () => {
    const { json } = runFilter(new UnauthorizedException());

    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token',
      error: { code: 'UNAUTHORIZED', details: null },
    });
  });

  it('formats forbidden errors', () => {
    const { json } = runFilter(new ForbiddenException());

    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'You do not have permission to perform this action',
      error: { code: 'FORBIDDEN', details: null },
    });
  });

  it('hides internal error details for unknown exceptions', () => {
    const { status, json } = runFilter(new Error('database connection failed'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: { code: 'INTERNAL_ERROR', details: null },
    });
  });
});
