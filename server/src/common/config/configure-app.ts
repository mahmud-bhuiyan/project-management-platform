import { RequestMethod, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionFilter } from '../filters/http-exception.filter.js';
import { TransformInterceptor } from '../interceptors/transform.interceptor.js';
import { buildErrorResponse } from '../utils/api-response.util.js';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
}

export function registerNotFoundHandler(app: INestApplication): void {
  app.getHttpAdapter().getInstance().use((req: Request, res: Response) => {
    res
      .status(404)
      .json(
        buildErrorResponse(
          `Cannot ${req.method} ${req.originalUrl}`,
          'NOT_FOUND',
        ),
      );
  });
}
