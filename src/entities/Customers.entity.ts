import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LessonEntity } from './Lesson.entity';

@Entity('customers')
export class CustomersEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '고객 id' })
  id: string;

  @Column({ comment: '고객 이름' })
  name: string;

  @Column({ comment: '고객 호번호' })
  phone_number: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => LessonEntity, (lesson) => lesson.customers, {
    cascade: true,
  })
  lessons: LessonEntity[];
}
