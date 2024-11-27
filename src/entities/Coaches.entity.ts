import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LessonEntity } from './Lesson.entity';

@Entity('coaches')
export class CoachesEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: '코치 id',
  })
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, comment: '코치 이름' })
  name: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => LessonEntity, (lesson) => lesson.coach, {
    cascade: true,
  })
  lessons: LessonEntity[];
}
