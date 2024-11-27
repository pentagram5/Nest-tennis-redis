import { ApiProperty } from '@nestjs/swagger';
import { CreateLessonReqDto } from './create-lesson.dto';
import { LessonSearchParamReqDto } from './read-lesson.dto';
import { IsString } from 'class-validator';

export class UpdateLessonReqBodyDto extends CreateLessonReqDto {
  @ApiProperty({
    description: '패스워드',
    required: true,
  })
  @IsString({
    message: '패스워드는 스트링 타입만 가능합니다.',
  })
  password: string;
}

export class UpdateLessonParamDto extends LessonSearchParamReqDto {}
