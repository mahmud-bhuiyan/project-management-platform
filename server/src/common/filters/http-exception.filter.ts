import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiExceptionPayload } from '../interfaces/api-response.interface.js';
import { buildErrorResponse } from '../utils/api-response.util.js';

const DEFAULT_ERROR_MESSAGES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad request',
  [HttpStatus.UNAUTHORIZED]: 'Invalid or expired token',
  [HttpStatus.FORBIDDEN]:
    'You do not have permission to perform this action',
  [HttpStatus.NOT_FOUND]: 'Resource not found',
  [HttpStatus.CONFLICT]: 'Resource conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Validation failed',
  [HttpStatus.INTERNAL_SERVER_ERROR]:
    'Something went wrong. Please try again later.',
};

const DEFAULT_ERROR_CODES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message =
      DEFAULT_ERROR_MESSAGES[status as HttpStatus] ??
      'Something went wrong. Please try again later.';
    let code = DEFAULT_ERROR_CODES[status as HttpStatus] ?? 'INTERNAL_ERROR';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const payload = exceptionResponse as ApiExceptionPayload & {
          message: string | string[];
        };

        const rawMessage = payload.message;

        if (payload.code) {
          code = payload.code;
          message = Array.isArray(rawMessage)
            ? 'Validation failed'
            : String(rawMessage);
          details = payload.details ?? null;
        } else if (Array.isArray(rawMessage)) {
          details = rawMessage;
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
        } else if (!DEFAULT_ERROR_CODES[status as HttpStatus]) {
          message = String(rawMessage);
        }
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof HttpException)) {
      message = DEFAULT_ERROR_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]!;
      code = 'INTERNAL_ERROR';
      details = null;
    }

    response.status(status).json(buildErrorResponse(message, code, details));
  }
}
