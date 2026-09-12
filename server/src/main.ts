import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import {
  configureApp,
  registerNotFoundHandler,
} from './common/config/configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flowdesk API')
    .setDescription('Project management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  registerNotFoundHandler(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`  Server running in: http://localhost:${port}`);
}
await bootstrap();
