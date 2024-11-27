import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleEntity } from './Schedule.entity';
import { CustomersEntity } from './Customers.entity';
import { CoachesEntity } from './Coaches.entity';

@Entity('lesson')
export class LessonEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: '레슨 id',
  })
  id: string;

  @ManyToOne(() => CustomersEntity, (customer) => customer.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'customer_id',
    foreignKeyConstraintName: 'FK_CUSTOMER_ID',
  })
  customers: CustomersEntity;

  @ManyToOne(() => CoachesEntity, (coach) => coach.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'coach_id', foreignKeyConstraintName: 'FK_COACHES_ID' })
  coach: CoachesEntity;

  @Column({ name: 'customer_id', comment: '레슨 참여 고객 id' })
  customerId: string;

  @Column({ name: 'coach_id', comment: '레슨 참여 코치 id' })
  coachId: string;

  @Column({ name: 'lesson_type', comment: '레슨 종류 : one_time  or regular' })
  lessonType: string;

  @Column({ comment: '주 참여 횟수 (1,2,3)' })
  frequency: number; // 주 몇 회 (1, 2, 3)

  @Column({ comment: '레슨 시간' })
  duration: number; // 레슨 시간 (30분 또는 60분)

  @Column({
    type: 'boolean',
    name: 'is_activate',
    default: true,
    comment: '레슨 활성화 여부',
  })
  isActivate: boolean;

  @Column({
    name: 'start_date',
    type: 'date',
    comment: '레슨 시작 일자 YYYY-MM-DD',
  })
  startDate: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '비밀번호 - hash',
    nullable: true,
  })
  password: string; // 비밀번호 - 해싱처리

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ScheduleEntity, (schedule) => schedule.lesson, {
    cascade: true,
  })
  schedule: ScheduleEntity[];
}
