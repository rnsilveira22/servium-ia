import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { INestApplication } from '@nestjs/common';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { LoginRateLimitInterceptor } from './auth/login-rate-limit.interceptor';

export async function buildApp(logger = false): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: logger ? ['log', 'error', 'warn'] : false,
  });

  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.enableShutdownHooks();
  app.use(new CorrelationIdMiddleware().use);
  // Estado in-memory por instância (single-instance): criado aqui para ser
  // isolado por app em testes e reaproveitado pelo processo principal.
  app.useGlobalInterceptors(new LoginRateLimitInterceptor());

  return app;
}
