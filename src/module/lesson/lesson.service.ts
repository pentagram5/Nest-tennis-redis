import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateLessonReqDto,
  CreateLessonResDto,
} from './dto/create-lesson.dto';
import { UpdateLessonReqBodyDto } from './dto/update-lesson.dto';
import { CoachesEntity } from '../../entities/Coaches.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { LessonEntity } from '../../entities/Lesson.entity';
import { ScheduleEntity } from '../../entities/Schedule.entity';
import {
  LessonSearchAllReqDto,
  LessonSearchAllResDto,
  LessonSearchResDto,
} from './dto/read-lesson.dto';
import {
  calculateEndTime,
  generateWeekSchedule,
  getClosestWeekday,
  getDateRange,
  getTimeAfter,
  getTodayWeekdayIndex,
} from '../../util/timeUtil';
import { comparePassword, hashingPassword } from '../../util/bcryptUtil';
import Redlock from 'redlock';
import { RedisService } from '../redis/redis.service';
import { Http2xxBase } from '../../dto/http-response.dto';
import { LessonQueryService } from './lesson.query.service';

@Injectable()
export class LessonService {
  private redlock: Redlock;
  private lessonCreateLockResource = 'lesson-create-lock';
  private lessonUpdateLockResource = 'lesson-update-lock';

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly lessonQueryService: LessonQueryService,
  ) {
    const redisClient = this.redisService.getClient();
    this.redlock = new Redlock([redisClient], {
      driftFactor: 0.01, // 클럭 드리프트 허용 오차
      retryCount: 10, // 재시도 횟수
      retryDelay: 200, // 재시도 간격
      retryJitter: 200, // 재시도 지터
    });
  }

  async findAll(
    lessonSearchAllDto: LessonSearchAllReqDto,
  ): Promise<LessonSearchAllResDto> {
    const schedule = generateWeekSchedule();
    const { startDate, endDate } = getDateRange();
    const coachInfo = await this.lessonQueryService.getCoachInfo(
      lessonSearchAllDto.coach,
    );
    const result = await this.lessonQueryService.getLessons(startDate, endDate);
    this.updateScheduleWithLessons(result, coachInfo, schedule);
    lessonSearchAllDto.lessonType === 'one_time'
      ? this.checkOneTypeLessonsAvailable(schedule, lessonSearchAllDto.duration)
      : this.checkRegularLessonsAvailable(
          schedule,
          lessonSearchAllDto.frequency,
          lessonSearchAllDto.duration,
        );
    const returnSchedule = this.scheduleReshape(schedule);

    return { success: true, data: returnSchedule };
  }

  async remove(id: string, password: string): Promise<Http2xxBase> {
    const lessonItem = await this.lessonQueryService.getLessonInfo(id);
    const todayIndex = getTodayWeekdayIndex();

    if (!lessonItem)
      throw new NotFoundException({
        success: false,
        message: 'id와 부합하는 레슨이 존재하지 않습니다.',
      });
    if (!(await comparePassword(password, lessonItem.password)))
      throw new ForbiddenException({
        success: false,
        message: '비밀번호가 맞지않습니다.',
      });

    const todayLesson =
      await this.lessonQueryService.getScheduleInfoByLessonIdAndWeekDay(
        lessonItem.id,
        todayIndex,
      );
    if (todayLesson)
      throw new UnprocessableEntityException({
        success: false,
        message: '금일 예정된 레슨이 있으며, 당일 취소는 불가합니다.',
      });

    lessonItem.isActivate = false;
    await this.lessonQueryService.saveLessonInfo(lessonItem);
    return { success: true };
  }

  async findOne(id: string, password: string): Promise<LessonSearchResDto> {
    const lessonItem = await this.lessonQueryService.getLessonInfo(id);
    if (!lessonItem)
      throw new NotFoundException({
        success: false,
        message: 'id와 부합하는 레슨이 존재하지 않습니다.',
      });
    if (!(await comparePassword(password, lessonItem.password)))
      throw new ForbiddenException({
        success: false,
        message: '비밀번호가 맞지않습니다.',
      });

    const coachInfo = await this.lessonQueryService.getCoachInfo(
      lessonItem.coachId,
    );

    const scheduleInfo =
      await this.lessonQueryService.getScheduleInfoByLessonId(lessonItem.id);
    return {
      success: true,
      data: {
        id: lessonItem.id,
        coachName: coachInfo.name,
        lessonType: lessonItem.lessonType,
        frequency: lessonItem.frequency,
        duration: lessonItem.duration,
        scheduleInfos: scheduleInfo.map((item) => {
          return {
            day: item.weekday,
            time: item.startTime,
          };
        }),
      },
    };
  }

  async handleTransaction<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    lockResource: string,
  ): Promise<T> {
    const lock = await this.redlock.acquire([lockResource], 10000);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await lock.release();
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    updateLessonBodyDto: UpdateLessonReqBodyDto,
  ): Promise<Http2xxBase> {
    return this.handleTransaction(async (queryRunner) => {
      const lessonItem = await this.lessonQueryService.getLessonInfo(id);
      if (!lessonItem)
        throw new NotFoundException({
          success: false,
          message: 'id와 부합하는 레슨이 존재하지 않습니다.',
        });
      if (lessonItem.lessonType !== 'regular') {
        throw new UnprocessableEntityException({
          success: false,
          message: '정규레슨만 수정이 가능합니다.',
        });
      }
      if (
        !(await comparePassword(
          updateLessonBodyDto.password,
          lessonItem.password,
        ))
      )
        throw new ForbiddenException({
          success: false,
          message: '비밀번호가 맞지않습니다.',
        });

      const { startDate, endDate } = getDateRange();

      const { customerInfo, coachInfo } =
        await this.lessonQueryService.getCustomerAndCoachForUpdateWithValidate(
          updateLessonBodyDto,
          lessonItem,
          queryRunner,
        );
      const schedule = generateWeekSchedule();

      const result = await this.lessonQueryService.getLessonsQueryRunner(
        startDate,
        endDate,
        queryRunner,
      );
      this.updateScheduleWithLessons(result, coachInfo, schedule);
      this.checkRegularLessonsAvailable(
        schedule,
        updateLessonBodyDto.frequency,
        updateLessonBodyDto.duration,
      );
      const possibleSchedule = [];
      const lessonDataObj = {};

      updateLessonBodyDto.requestDate.map((item) => {
        const day = getClosestWeekday(item.day);
        if (!schedule[day][item.time]) {
          if ([0, 6].includes(item.day)) {
            throw new UnprocessableEntityException({
              success: false,
              message: `해당 요일 및 시간대에는 레슨이 가능한 남은 코트가 없습니다. 다른 시간 혹은 요일을 선택해주세요.`,
            });
          }
          throw new UnprocessableEntityException({
            success: false,
            message: `${updateLessonBodyDto.coach} 강사는 ${day} ${item.time}에 이미 예약된 레슨이 있습니다. 다른 시간 혹은 요일을 선택해주세요.`,
          });
        } else {
          lessonDataObj[day] = item.time;
          const newSchedule = new ScheduleEntity();
          newSchedule.weekday = item.day;
          newSchedule.startTime = item.time;
          newSchedule.endTime = calculateEndTime(
            item.time,
            updateLessonBodyDto.duration,
          );
          possibleSchedule.push(newSchedule);
        }
      });
      const newLesson = new LessonEntity();
      newLesson.id = id;
      newLesson.customerId = customerInfo.id;
      newLesson.coachId = coachInfo.id;
      newLesson.lessonType = updateLessonBodyDto.lessonType;
      newLesson.frequency = updateLessonBodyDto.frequency;
      newLesson.duration = updateLessonBodyDto.duration;
      newLesson.startDate = new Date(
        Math.min(
          ...Object.keys(lessonDataObj).map((date) => new Date(date).getTime()),
        ),
      )
        .toISOString()
        .split('T')[0];
      newLesson.password = lessonItem.password;

      const savedLesson = await queryRunner.manager.save(newLesson);

      await Promise.all(
        possibleSchedule.map(async (scheduleItem: ScheduleEntity) => {
          scheduleItem.lessonId = savedLesson.id;
          await queryRunner.manager.save(ScheduleEntity, scheduleItem);
        }),
      );
      await queryRunner.commitTransaction();
      return {
        success: true,
      };
    }, this.lessonUpdateLockResource);
  }

  async create(
    createLessonReqDto: CreateLessonReqDto,
  ): Promise<CreateLessonResDto> {
    return this.handleTransaction(async (queryRunner) => {
      const { startDate, endDate } = getDateRange();

      const { customerInfo, coachInfo } =
        await this.lessonQueryService.getCustomerAndCoachForCreateWithValidate(
          createLessonReqDto,
          queryRunner,
        );

      const schedule = generateWeekSchedule();
      const result = await this.lessonQueryService.getLessonsQueryRunner(
        startDate,
        endDate,
        queryRunner,
      );
      this.updateScheduleWithLessons(result, coachInfo, schedule);
      createLessonReqDto.lessonType === 'one_time'
        ? this.checkOneTypeLessonsAvailable(
            schedule,
            createLessonReqDto.duration,
          )
        : this.checkRegularLessonsAvailable(
            schedule,
            createLessonReqDto.frequency,
            createLessonReqDto.duration,
          );
      const possibleSchedule = [];
      const lessonDataObj = {};

      createLessonReqDto.requestDate.map((item) => {
        const day = getClosestWeekday(item.day);
        if (!schedule[day][item.time]) {
          if ([0, 6].includes(item.day)) {
            throw new UnprocessableEntityException({
              success: false,
              message: `해당 요일 및 시간대에는 레슨이 가능한 남은 코트가 없습니다. 다른 시간 혹은 요일을 선택해주세요.`,
            });
          }
          throw new UnprocessableEntityException({
            success: false,
            message: `${createLessonReqDto.coach} 강사는 ${day} ${item.time}에 이미 예약된 레슨이 있습니다. 다른 시간 혹은 요일을 선택해주세요.`,
          });
        } else {
          lessonDataObj[day] = item.time;
          const newSchedule = new ScheduleEntity();
          newSchedule.weekday = item.day;
          newSchedule.startTime = item.time;
          newSchedule.endTime = calculateEndTime(
            item.time,
            createLessonReqDto.duration,
          );
          possibleSchedule.push(newSchedule);
        }
      });
      const newLesson = new LessonEntity();
      newLesson.customerId = customerInfo.id;
      newLesson.coachId = coachInfo.id;
      newLesson.lessonType = createLessonReqDto.lessonType;
      newLesson.frequency = createLessonReqDto.frequency;
      newLesson.duration = createLessonReqDto.duration;
      newLesson.startDate = new Date(
        Math.min(
          ...Object.keys(lessonDataObj).map((date) => new Date(date).getTime()),
        ),
      )
        .toISOString()
        .split('T')[0];
      const { randomString: originPw, hashPassword } = await hashingPassword();
      newLesson.password = hashPassword;

      const savedLesson = await queryRunner.manager.save(newLesson);

      await Promise.all(
        possibleSchedule.map(async (scheduleItem: ScheduleEntity) => {
          scheduleItem.lessonId = savedLesson.id;
          await queryRunner.manager.save(ScheduleEntity, scheduleItem);
        }),
      );
      await queryRunner.commitTransaction();
      return {
        success: true,
        data: {
          id: savedLesson.id,
          password: originPw,
          lessonStartDateTime: `${savedLesson.startDate} ${lessonDataObj[savedLesson.startDate]}`,
        },
      };
    }, this.lessonCreateLockResource);
  }

  //스케줄 기반 일회성 레슨 참여 가능 일자 존재 확인
  private checkOneTypeLessonsAvailable(
    schedule: Record<string, Record<string, number>>,
    duration: number,
  ) {
    let check = false;
    outer: for (const day of Object.keys(schedule)) {
      for (const time of Object.keys(schedule[day])) {
        if (duration === 60) {
          if (time != '22:30:00' && schedule[day][getTimeAfter(time)]) {
            check = true;
            break outer;
          }
        } else if (schedule[day][time]) {
          check = true;
          break outer;
        }
      }
    }
    if (!check) {
      throw new UnprocessableEntityException({
        success: false,
        message: '해당 조건에 가능한 레슨 시간이 없습니다.',
      });
    }
  }

  //스케줄 기반 정규레슨 참여 가능 일자 존재 확인
  private checkRegularLessonsAvailable(
    schedule: Record<string, Record<string, number>>,
    frequency: number,
    duration: number,
  ) {
    let freCount = 0;
    for (const day of Object.keys(schedule)) {
      for (const time of Object.keys(schedule[day])) {
        if (duration === 60) {
          if (time != '22:30:00' && schedule[day][getTimeAfter(time)]) {
            freCount += 1;
            break;
          }
        } else if (schedule[day][time]) {
          freCount += 1;
          break;
        }
      }
      if (freCount >= frequency) {
        break;
      }
    }
    if (freCount < frequency) {
      throw new UnprocessableEntityException({
        success: false,
        message: '해당 조건에 가능한 레슨 시간이 없습니다.',
      });
    }
  }

  // 조회된 스케줄 데이터를 기반하여 스케줄 객체 수정
  private updateScheduleWithLessons(
    lessons: ScheduleEntity[],
    coachInfo: CoachesEntity,
    schedule: Record<string, Record<string, number>>,
  ) {
    lessons.map((item) => {
      if (item.lesson.coachId == coachInfo.id) {
        this.removeLessonFromSchedule(item, schedule);
      } else {
        this.adjustScheduleForWeekends(item, schedule);
      }
    });
  }

  // 다음날부터 7일 이내에 특정 코치에 대한 등록된 스케줄 기반 조정 - 전제 조건:스케줄의 코치정보가 요청한 코치정보와 동일할때
  private removeLessonFromSchedule(
    item: ScheduleEntity,
    schedule: Record<string, Record<string, number>>,
  ) {
    schedule[getClosestWeekday(item.weekday)][item.startTime] = 0;
    if (item.lesson.duration === 60) {
      schedule[getClosestWeekday(item.weekday)][getTimeAfter(item.startTime)] =
        0;
    }
  }

  // 주말 레슨에 대한 코트 사용여부(같은 스케줄이 있을때 마다 코트 사용여부 기준제외) 스케줄 조정
  private adjustScheduleForWeekends(
    item: ScheduleEntity,
    schedule: Record<string, Record<string, number>>,
  ) {
    if ([0, 6].includes(item.weekday)) {
      schedule[getClosestWeekday(item.weekday)][item.startTime] > 0
        ? (schedule[getClosestWeekday(item.weekday)][item.startTime] -= 1)
        : schedule[getClosestWeekday(item.weekday)][item.startTime];
    }
  }

  // 스케줄 객체 리쉐입 - findAll에서만 사용
  private scheduleReshape(
    schedule: Record<string, Record<string, number>>,
  ): string[] {
    const dayList = [];
    for (const day of Object.keys(schedule)) {
      for (const time of Object.keys(schedule[day])) {
        if (schedule[day][time]) {
          dayList.push(`${day} ${time}`);
        }
      }
    }
    return dayList;
  }
}
