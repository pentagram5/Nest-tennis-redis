import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeORMConfig } from './config/typeorm.config';
import { LessonModule } from './module/lesson/lesson.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [],
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        await typeORMConfig(configService),
    }),
    // TypeOrmModule.forFeature([
    //   CoachesEntity,
    //   CustomersEntity,
    //   LessonEntity,
    //   ScheduleEntity,
    // ]),
    LessonModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
