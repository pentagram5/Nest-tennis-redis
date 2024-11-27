import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger 세팅
 *
 * @param {INestApplication} app
 */
export function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle(
      '[어글리어스 백엔드 개발자 채용 과제] - 테니스 정기 레슨 신청 API Docs',
    )
    .setDescription(
      '<strong>API 관련 사항</strong><br>' +
        '<ul>' +
        '  <li>모든 파라미터 및 리턴 데이터 스키마의 명명규칙은 `카멜케이스`로 되어있습니다.</li>' +
        '</ul>',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
}
