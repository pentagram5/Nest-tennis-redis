import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachesEntity } from '../../entities/Coaches.entity';
import { CustomersEntity } from '../../entities/Customers.entity';
import { LessonEntity } from '../../entities/Lesson.entity';
import { ScheduleEntity } from '../../entities/Schedule.entity';
import { RedisService } from '../redis/redis.service';
import { LessonQueryService } from './lesson.query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoachesEntity,
      CustomersEntity,
      LessonEntity,
      ScheduleEntity,
    ]),
  ],
  controllers: [LessonController],
  providers: [LessonService, LessonQueryService, RedisService],
})
export class LessonModule {}
