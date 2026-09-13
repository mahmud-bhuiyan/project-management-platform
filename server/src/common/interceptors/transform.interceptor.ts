import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  ApiSuccessResponse,
  ControllerResponse,
} from '../interfaces/api-response.interface.js';
import { buildSuccessResponse } from '../utils/api-response.util.js';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse> {
    if (context.getType?.() === 'ws') {
      return next.handle() as Observable<ApiSuccessResponse>;
    }

    return next.handle().pipe(
      map((payload) => {
        if (payload === undefined) {
          return buildSuccessResponse(null);
        }

        if (
          payload &&
          typeof payload === 'object' &&
          'success' in payload
        ) {
          return payload as unknown as ApiSuccessResponse;
        }

        if (payload && typeof payload === 'object' && 'data' in payload) {
          const response = payload as ControllerResponse;

          return buildSuccessResponse(response.data, {
            message: response.message,
            meta: response.meta,
          });
        }

        return buildSuccessResponse(payload);
      }),
    );
  }
}
