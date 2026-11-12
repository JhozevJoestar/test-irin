import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const detail = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof detail === 'string'
        ? detail
        : detail && typeof detail === 'object' && 'message' in detail
          ? detail.message
          : 'Внутренняя ошибка сервера';
    if (status === 500) console.error(error);
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  app.use(helmet());
  app.use(cookieParser());
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:8080';
  app.enableCors({ origin, credentials: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin !== origin
    ) {
      res.status(403).json({
        statusCode: 403,
        message: new ForbiddenException('Недопустимый Origin').message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Истинный интеллект API')
        .setVersion('1.0')
        .addCookieAuth('session')
        .build(),
    ),
  );
  return app;
}
