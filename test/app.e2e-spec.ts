import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { LessonService } from '../src/module/lesson/lesson.service';
import { LessonModule } from '../src/module/lesson/lesson.module';
import { getClosestWeekday } from '../src/util/timeUtil';

describe('Lesson API (e2e) 테스트', () => {
  let app: INestApplication;
  let lessonService: LessonService;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, LessonModule], // 실제 AppModule 사용
    }).compile();

    lessonService = moduleFixture.get<LessonService>(LessonService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Lesson 생성, 조회, 수정, 최소 테스트', () => {
    const testPayload = {
      coach: '김민준',
      lessonType: 'regular',
      frequency: 1,
      duration: 30,
      name: 'e2eTestCustomer',
      phoneNumber: '01011111111',
      requestDate: [
        {
          day: 3,
          time: '07:00:00',
        },
      ],
    };
    let lessonResult;
    let patchPayload;
    it('POST /lesson - 레슨 생성 테스트', async () => {
      const response = await request(app.getHttpServer())
        .post('/lesson') // 실제 엔드포인트 경로
        .set('Accept', '*/*')
        .set('Content-Type', 'application/json')
        .send(testPayload)
        .expect(201);
      lessonResult = response.body;
    });

    it('GET /lesson - 조회시 신청한 레슨 일자가 신청가능 일자에서 제외확인', async () => {
      const requestDate = getClosestWeekday(testPayload.requestDate[0].day);
      const checkTime = `${requestDate} ${testPayload.requestDate[0].time}`;
      const response = await request(app.getHttpServer())
        .get('/lesson')
        .query({
          coach: '김민준',
          lessonType: 'one_time',
          frequency: 1,
          duration: 30,
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data).not.toContainEqual(checkTime);
    });

    it('GET /lesson/{id} - 레슨 상세 조회 및 요청데이터와 동인일한지 확인', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lesson/${lessonResult.data.id}`)
        .query({
          password: lessonResult.data.password,
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      const expectedData = {
        id: lessonResult.data.id,
        coachName: testPayload.coach,
        lessonType: testPayload.lessonType,
        frequency: testPayload.frequency,
        duration: testPayload.duration,
        scheduleInfos: testPayload.requestDate,
      };
      expect(response.body.data).toEqual(expectedData);
    });
    it('PATCH /lesson/{id} - 레슨 데이터 시간 수정', async () => {
      patchPayload = {
        coach: testPayload.coach,
        lessonType: testPayload.lessonType,
        frequency: testPayload.frequency,
        duration: testPayload.duration,
        name: testPayload.name,
        phoneNumber: testPayload.phoneNumber,
        requestDate: [
          {
            day: 3,
            time: '09:00:00',
          },
        ],
        password: lessonResult.data.password,
      };
      const response = await request(app.getHttpServer())
        .patch(`/lesson/${lessonResult.data.id}`)
        .set('Accept', '*/*')
        .set('Content-Type', 'application/json')
        .send(patchPayload);
      expect(response.status).toBe(200);
    });

    it('GET /lesson/{id} - 수정한 데이터가 반영되었는지 확인', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lesson/${lessonResult.data.id}`)
        .query({
          password: lessonResult.data.password,
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      const expectedData = {
        id: lessonResult.data.id,
        coachName: testPayload.coach,
        lessonType: testPayload.lessonType,
        frequency: testPayload.frequency,
        duration: testPayload.duration,
        scheduleInfos: patchPayload.requestDate,
      };
      expect(response.body.data).toEqual(expectedData);
    });

    it('DELETE /lesson/{id} - 레슨 취소', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/lesson/${lessonResult.data.id}`)
        .query({
          password: lessonResult.data.password,
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
    });
    it('GET /lesson/{id} - 레슨 취소 후 상세 조회 시 404', async () => {
      const response = await request(app.getHttpServer())
        .get(`/lesson/${lessonResult.data.id}`)
        .query({
          password: lessonResult.data.password,
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(
        'id와 부합하는 레슨이 존재하지 않습니다.',
      );
    });
  });

  describe('동시성 테스트 - 10명의 고객이 동시에 레슨 신청', () => {
    it('POST /lesson (동시성 태스트)', async () => {
      // 요청 데이터
      const payload = {
        coach: '김민준',
        lessonType: 'regular',
        frequency: 1,
        duration: 30,
        name: 'testBase',
        phoneNumber: '01011111111',
        requestDate: [
          {
            day: 3,
            time: '14:00:00',
          },
        ],
      };

      // 동시 요청 생성
      const requests = [];

      for (let i = 0; i < 10; i++) {
        payload.name = payload.name + String(i);
        requests.push(
          request(app.getHttpServer())
            .post('/lesson') // 실제 엔드포인트 경로
            .set('Accept', '*/*')
            .set('Content-Type', 'application/json')
            .send(payload),
        );
      }

      // 병렬 실행
      const results = await Promise.all(requests);

      let successCount = 0;
      results.forEach((result) => {
        if (result.statusCode === 201) {
          successCount += 1;
        }
      });
      expect(successCount).toBe(1);
    });
  });

  describe('TEST 종료 및 초기화', () => {
    it('DB 초기화', async () => {
      const result = await lessonService.initDb();
      expect(result).toBe(true);
    });
  });
  afterAll(async () => {
    await app.close();
  });
});
