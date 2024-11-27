import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupSwagger(app);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // DTO 자동 변환
      exceptionFactory: (errors: ValidationError[]) => {
        if (errors.length > 0) {
          const formattedErrors = formatValidationErrors(errors);
          return new BadRequestException({
            success: false,
            message: formattedErrors,
          });
        }
        return { success: false, message: errors };
      },
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);
}

function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => {
      let baseError = Object.values(error.constraints || {});
      error.children.map((item) =>
        item.children.map((ee) => {
          baseError = [...baseError, ...Object.values(ee.constraints || {})];
        }),
      );
      return [...new Set(baseError)].join('\n');
    })
    .join('\n');
}

bootstrap();
