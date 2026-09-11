import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    app.getHttpAdapter().getInstance().use((req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Cannot ${req.method} ${req.originalUrl}`,
          details: [],
        },
      });
    });
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('ok');
      });
  });

  it('/api/v1/unknown (GET) returns JSON error', () => {
    return request(app.getHttpServer())
      .get('/api/v1/unknown')
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBeDefined();
        expect(res.body.error.message).toBeDefined();
        expect(Array.isArray(res.body.error.details)).toBe(true);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
