import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

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

    let message = 'Internal server error';
    let code = HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR';
    let details: unknown[] = [];

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const rawMessage = exceptionResponse.message;
      message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : String(rawMessage);

      if ('code' in exceptionResponse && exceptionResponse.code) {
        code = String(exceptionResponse.code);
      }

      if ('details' in exceptionResponse && Array.isArray(exceptionResponse.details)) {
        details = exceptionResponse.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const body: ApiErrorBody = {
      error: {
        code,
        message,
        details,
      },
    };

    response.status(status).json(body);
  }
}
