import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiExceptionPayload } from '../interfaces/api-response.interface.js';

export class ApiException extends HttpException {
  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details: unknown = null,
  ) {
    const payload: ApiExceptionPayload = {
      message,
      code,
      details,
    };

    super(payload, status);
  }
}
