import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CoachesEntity } from '../../entities/Coaches.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { LessonEntity } from '../../entities/Lesson.entity';
import { CustomersEntity } from '../../entities/Customers.entity';
import { ScheduleEntity } from '../../entities/Schedule.entity';
import { CreateLessonReqDto } from './dto/create-lesson.dto';
import { UpdateLessonReqBodyDto } from './dto/update-lesson.dto';
import { getDateRange } from '../../util/timeUtil';

@Injectable()
export class LessonQueryService {
  constructor(
    @InjectRepository(CoachesEntity)
    private coachesRepo: Repository<CoachesEntity>,
    @InjectRepository(LessonEntity)
    private lessonRepo: Repository<LessonEntity>,
    @InjectRepository(CustomersEntity)
    private customerRepo: Repository<CustomersEntity>,
    @InjectRepository(ScheduleEntity)
    private scheduleRepo: Repository<ScheduleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // id 기반 레슨 정보 리턴
  async getLessonInfo(id: string) {
    return await this.lessonRepo.findOne({
      where: {
        id,
        isActivate: true,
      },
    });
  }

  //레슨 아이템 create or update
  async saveLessonInfo(lessonItem: LessonEntity) {
    await this.lessonRepo.save(lessonItem);
  }

  // id 기반 고객 정보 리턴
  async getCustomerInfoById(id: string) {
    return await this.customerRepo.findOne({
      where: {
        id,
      },
    });
  }

  //고객 정보 조회 혹은 생성(없을시)
  async getCustomerInfoOrCreate(
    createLessonReqDto: CreateLessonReqDto,
    queryRunner: QueryRunner,
  ) {
    const customerInfo = await queryRunner.manager.findOne(CustomersEntity, {
      where: {
        name: createLessonReqDto.name,
        phone_number: createLessonReqDto.phoneNumber,
      },
    });
    if (!customerInfo) {
      const newUser = new CustomersEntity();
      newUser.name = createLessonReqDto.name;
      newUser.phone_number = createLessonReqDto.phoneNumber;
      return await queryRunner.manager.save(newUser);
    }
    return customerInfo;
  }

  //고객정보 기반 레슨신청 제약조건 확인 후 고객, 코치정보 리턴 - for create
  async getCustomerAndCoachForCreateWithValidate(
    dto: CreateLessonReqDto | UpdateLessonReqBodyDto,
    queryRunner: QueryRunner,
  ): Promise<{ customerInfo: CustomersEntity; coachInfo: CoachesEntity }> {
    const customerInfo = await this.getCustomerInfoOrCreate(dto, queryRunner);
    await this.checkExistCustomerLessonAvailable(
      customerInfo,
      dto.lessonType,
      getDateRange().startDate,
      getDateRange().endDate,
      queryRunner,
    );

    const coachInfo = await this.getCoachInfo(dto.coach);
    return { customerInfo, coachInfo };
  }

  //고객정보 기반 레슨신청 제약조건 확인 후 고객, 코치정보 리턴 - for update
  async getCustomerAndCoachForUpdateWithValidate(
    dto: CreateLessonReqDto | UpdateLessonReqBodyDto,
    lessonItem: LessonEntity,
    queryRunner: QueryRunner,
  ): Promise<{ customerInfo: CustomersEntity; coachInfo: CoachesEntity }> {
    //고객 정보 update 선행
    const customerInfo = await this.getCustomerInfoById(lessonItem.customerId);
    customerInfo.name = dto.name;
    customerInfo.phone_number = dto.phoneNumber;
    await queryRunner.manager.save(customerInfo);
    await this.checkExistCustomerLessonAvailable(
      customerInfo,
      dto.lessonType,
      getDateRange().startDate,
      getDateRange().endDate,
      queryRunner,
    );

    const coachInfo = await this.getCoachInfo(dto.coach);
    return { customerInfo, coachInfo };
  }

  // 이름 기반 코치 정보 리턴
  async getCoachInfo(name: string) {
    return await this.coachesRepo.findOne({
      where: {
        name: name,
      },
    });
  }

  //레슨id 기반 스케줄 정보 리턴
  async getScheduleInfoByLessonId(lessonId: string) {
    return await this.scheduleRepo.find({
      where: {
        lessonId,
      },
    });
  }

  //레슨id 및 요일 기반 스케줄 정보 리턴
  async getScheduleInfoByLessonIdAndWeekDay(lessonId: string, weekDay: number) {
    return await this.scheduleRepo.find({
      where: {
        lessonId,
        weekday: weekDay,
      },
    });
  }

  // 레슨 조회 쿼리 수행 - is_activate true인 경우만 수행
  async getLessons(
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEntity[]> {
    return await this.scheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.lesson', 'lesson')
      .where(
        'lesson.is_activate=true and ' +
          '(lesson.lesson_type = :regular OR ' +
          '(lesson.lesson_type = :one_time AND lesson.start_date >= :startDate AND lesson.start_date <= :endDate)' +
          ')',
        { regular: 'regular', one_time: 'one_time', startDate, endDate },
      )
      .getMany();
  }

  // 레슨 조회 쿼리 수행(트랜젝션) - is_activate true인 경우만 수행
  async getLessonsQueryRunner(
    startDate: string,
    endDate: string,
    queryRunner: QueryRunner,
  ): Promise<ScheduleEntity[]> {
    return await queryRunner.manager
      .createQueryBuilder(ScheduleEntity, 'schedule')
      .leftJoinAndSelect('schedule.lesson', 'lesson')
      .where(
        'lesson.is_activate=true and ' +
          '(lesson.lesson_type = :regular OR ' +
          '(lesson.lesson_type = :one_time AND lesson.start_date >= :startDate AND lesson.start_date <= :endDate)' +
          ')',
        { regular: 'regular', one_time: 'one_time', startDate, endDate },
      )
      .getMany();
  }

  //e2e 테스트 후 초기화 용으로 활용
  async initDb() {
    const appDataSource = this.dataSource;
    const entities = appDataSource.entityMetadatas;
    for await (const entity of entities) {
      if (entity.tableName !== 'coaches') {
        const repository = appDataSource.getRepository(entity.name);

        await repository.query(
          `DELETE
           FROM ${entity.tableName};`,
        );
      }
    }
    return true;
  }

  // 고객정보 기반 이미 등록된 레슨이 있는경우, 제약조건 확인
  private async checkExistCustomerLessonAvailable(
    customerInfo: CustomersEntity,
    lessonType: string,
    startDate: string,
    endDate: string,
    queryRunner: QueryRunner,
  ) {
    const lessonInfos = await queryRunner.manager.find(LessonEntity, {
      where: {
        customerId: customerInfo.id,
        isActivate: true,
      },
    });
    for (const lesson of lessonInfos) {
      if (lessonType === 'one_time') {
        if (lesson.lessonType === 'one_time') {
          //1회성 레슨이 예정되있는 경우
          if (startDate <= lesson.startDate && endDate >= lesson.startDate) {
            throw new UnprocessableEntityException({
              success: false,
              message: `${startDate} ~ ${endDate} 사이에 예정된 1회 레슨이 존재합니다. 취소 후 재신청 해주세요`,
            });
          } // 과거에 1회성 레슨을 받은 경우
          else if (lesson.startDate < startDate) {
            throw new UnprocessableEntityException({
              success: false,
              message: `고객님은 이미 1회 레슨을 신청하였습니다. 정기레슨을 신청해주세요.`,
            });
          }
        }
      } else {
        // 정기 레슨을 신청하는데 이미 정기레슨이 있는경우
        if (lesson.lessonType === 'regular') {
          throw new UnprocessableEntityException({
            success: false,
            message: `고객님은 정기레슨이 신청되어 있습니다. 취소 후 재신청 하거나 정기레슨을 수정해주세요.`,
          });
        } else if (lesson.lessonType === 'one_time') {
          //정기 레슨을 신청하는데 1회성 레슨이 예정되있는 경우
          if (startDate <= lesson.startDate && endDate >= lesson.startDate) {
            throw new UnprocessableEntityException({
              success: false,
              message: `${startDate} ~ ${endDate} 사이에 예정된 1회 레슨이 존재합니다. 취소 후 재신청 해주세요`,
            });
          }
        }
      }
    }
  }
}
