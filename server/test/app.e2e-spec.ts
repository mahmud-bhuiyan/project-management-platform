import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import {
  configureApp,
  registerNotFoundHandler,
} from './../src/common/config/configure-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    registerNotFoundHandler(app);
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
        expect(res.body.error).toBeUndefined();
      });
  });

  it('/api/v1/unknown (GET) returns JSON error', () => {
    return request(app.getHttpServer())
      .get('/api/v1/unknown')
      .expect(404)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Cannot GET /api/v1/unknown');
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.details).toBeNull();
        expect(res.body.data).toBeUndefined();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
