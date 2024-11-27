import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LessonEntity } from './Lesson.entity';

@Entity('schedule')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '스케줄 id' })
  id: string;

  @ManyToOne(() => LessonEntity, (lesson) => lesson.schedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'lesson_id',
    foreignKeyConstraintName: 'FK_LESSON_ID',
  })
  lesson: LessonEntity;

  @Column({ name: 'lesson_id', comment: '레슨 id' })
  lessonId: string;

  @Column({ comment: '요일 정보(0~6)' })
  weekday: number;

  @Column({ name: 'start_time', comment: '레슨 시작 시간 HH:mm:ss' })
  startTime: string;

  @Column({ name: 'end_time', comment: '레료슨 종료 시간 HH:mm:ss' })
  endTime: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
