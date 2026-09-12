import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return server running message', () => {
      const result = appController.getRoot();

      expect(result.message).toBe('Server is running');
    });
  });

  describe('health', () => {
    it('should return ok status', () => {
      const result = appController.getHealth();

      expect(result.status).toBe('ok');
    });
  });
});
