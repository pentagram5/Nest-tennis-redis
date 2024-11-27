import { IsArray, IsIn, IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Http2xxBase } from '../../../dto/http-response.dto';

export class LessonSearchAllReqDto {
  @ApiProperty({
    description: '강사의 이름 (김민준, 오서준, 이도윤, 박예준 중 선택)',
    required: true,
    enum: ['김민준', '오서준', '이도윤', '박예준'],
    example: '김민준',
  })
  @IsString({
    message: '강사 이름은 스트링 타입만 가능합니다.',
  })
  @IsIn(['김민준', '오서준', '이도윤', '박예준'], {
    message: '강사는 김민준, 오서준, 이도윤, 박예준 중에서만 선택 가능합니다.',
  })
  coach: string;

  // 'lesson_type'에 대한 유효한 값들을 정의할 수 있다.
  @ApiProperty({
    description: '수업의 유형 (one_time, regular 중 선택)',
    required: true,
    enum: ['one_time', 'regular'],
    example: 'one_time',
  })
  @IsString({
    message: '수업 유형은 스트링 타입만 가능합니다',
  })
  @IsIn(['one_time', 'regular'], {
    message: '수업 유형은 one_time 또는 regular 만 가능합니다.',
  })
  lessonType: string;

  @ApiProperty({
    description: '주 수업 횟수 (1, 2, 3 중 선택)',
    required: true,
    enum: [1, 2, 3],
    example: 1,
  })
  @Type(() => Number)
  @IsInt({
    message: '주 수업 횟수는 정수형 타입만 가능합니다',
  })
  @IsIn([1, 2, 3], {
    message: '주 수업 횟수는 1, 2, 3 중에서만 가능합니다.',
  })
  frequency: number;

  @ApiProperty({
    description: '수업시간 (30, 60 중 선택)',
    required: true,
    enum: [30, 60],
    example: 30,
  })
  @Type(() => Number)
  @IsInt({
    message: '수업시간은 정수형 타입만 가능합니다',
  })
  @IsIn([30, 60], { message: '수업시간은 30 또는 60만 가능합니다.' })
  duration: number;
}

export class LessonSearchAllResDto extends Http2xxBase {
  @ApiProperty({
    description: '요청가능한 날짜 목록 - YYYY-MM-DD HH:mm:ss',
    example: ['2024-11-19 07:00:00', '2024-11-19 07:30:00'],
  })
  @IsArray()
  @IsString({ each: true })
  data: string[];
}

export class LessonSearchParamReqDto {
  @ApiProperty({
    description: '레슨 id',
    required: true,
  })
  @IsString({
    message: '레슨 id는 스트링 타입만 가능합니다.',
  })
  id: string;
}

export class LessonSearchQueryReqDto {
  @ApiProperty({
    description: '패스워드',
    required: true,
  })
  @IsString({
    message: '패스워드는 스트링 타입만 가능합니다.',
  })
  password: string;
}

export class LessonScheduleInfo {
  @ApiProperty({
    description:
      '신청요일, (0:일요일 , 1:월요일, 2:화요일, 3:수요일, 4:목요일, 5:금요일, 6:일요일)',
    example: 3,
  })
  day: number;

  @ApiProperty({
    description: '신청 시간 - HH:mm:ss 형식',
    example: '08:30:00',
  })
  time: string;
}

export class LessonSearchResData {
  @ApiProperty({
    description: '레슨id',
    required: true,
  })
  id: string;

  @ApiProperty({
    description: '코치이름',
    required: true,
  })
  coachName: string;

  @ApiProperty({
    description: '수업의 유형 (one_time, regular )',
    enum: ['one_time', 'regular'],
    example: 'one_time',
  })
  lessonType: string;

  @ApiProperty({
    description: '주 수업 횟수 (1, 2, 3)',
    required: true,
    enum: [1, 2, 3],
    example: 1,
  })
  frequency: number;

  @ApiProperty({
    description: '수업시간 (30, 60)',
    enum: [30, 60],
    example: 30,
  })
  duration: number;

  @ApiProperty({
    description: '신청요일+시간 리스트',
    example: [
      {
        day: 3,
        time: '08:00:00',
      },
    ],
    type: [LessonScheduleInfo],
  })
  @Type(() => LessonScheduleInfo)
  scheduleInfos: LessonScheduleInfo[];
}

export class LessonSearchResDto extends Http2xxBase {
  @ApiProperty({
    description: '리턴 데이터',
  })
  @Type(() => LessonScheduleInfo)
  data: LessonSearchResData;
}
