import { LessonSearchAllReqDto } from './read-lesson.dto';
import { ApiProperty } from '@nestjs/swagger';
// 중복된 day 값이 없는지 검증하는 커스텀 검증기
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Http2xxBase } from '../../../dto/http-response.dto';

@ValidatorConstraint({ async: false })
class UniqueDaysConstraint implements ValidatorConstraintInterface {
  validate(
    requestDate: { day: number; time: string }[],
    args: ValidationArguments,
  ) {
    const days = requestDate.map((item) => item.day);
    return new Set(days).size === days.length; // 중복이 없으면 true
  }

  defaultMessage(args: ValidationArguments) {
    return 'requestDate 배열 내 day 값이 중복될 수 없습니다.';
  }
}

export class RequestDateItemDto {
  @ApiProperty({
    description:
      '신청요일, (0:일요일 , 1:월요일, 2:화요일, 3:수요일, 4:목요일, 5:금요일, 6:일요일)',
    example: 3,
  })
  @IsInt({ message: 'day는 정수형이어야 합니다.' })
  @Min(0, { message: 'day는 0 이상이어야 합니다.' })
  @Max(6, { message: 'day는 6 이하이어야 합니다.' })
  day: number;

  @ApiProperty({
    description:
      '신청 시간 - HH:mm:ss 형식이어야 하며 HH는 07~22, mm은 30 또는 60만 가능',
    example: '08:30:00',
  })
  @IsString({ message: 'time은 문자열 형식이어야 합니다.' })
  @Matches(/^(0[7-9]|1[0-9]|2[0-2]):(30|60|00):00$/, {
    message:
      'time은 HH:mm:ss 형식이어야 하며 HH는 07~22, mm은 30 또는 60만 가능합니다. ss는 00 고정입니다.',
  })
  time: string;
}

export class CreateLessonReqDto extends LessonSearchAllReqDto {
  @ApiProperty({
    description: '고객 이름',
    example: '김철수',
  })
  @IsString({
    message: '고객 이름은 스트링 타입만 가능합니다.',
  })
  name: string;

  @ApiProperty({
    description: '고객 전화번호(하이픈 제외)',
    example: '01011111111',
  })
  @IsString({
    message: '고객 전는화번호는 스트링 타입만 가능합니다.',
  })
  @Matches(/^\d+$/, {
    message: '고객 전화번호는 숫자로만 구성되어야 합니다.',
  })
  phoneNumber: string;

  @ApiProperty({
    description: '신청요일+시간 리스트',
    example: [
      {
        day: 3,
        time: '08:00:00',
      },
    ],
    type: [RequestDateItemDto],
  })
  @ArrayMaxSize(3, {
    message: 'requestDate 배열의 길이는 최대 3이어야 합니다.',
  })
  @Validate(UniqueDaysConstraint, {
    message: 'requestDate 배열 내 day 값이 중복될 수 없습니다.',
  })
  @IsArray({ message: 'requestDate 는 배열이어야 합니다.' })
  @ValidateNested()
  @Type(() => RequestDateItemDto)
  requestDate: RequestDateItemDto[];
}

export class ResponseDataDto {
  @ApiProperty({
    description: '레슨ID-uuid',
    example: '3d8a0f13-1ac3-4f9d-aa64-85eb65a9d76b',
  })
  id: string;

  @ApiProperty({
    description: '레슨 조회 및 수정을 위한 패스워드-8자랜덤스트링',
    example: 'kAl4Ls79',
  })
  password: string;

  @ApiProperty({
    description: '신청 내용 기반 레슨 시작일자 리턴 - YYYY-MM-DD HH:mm:ss',
    example: '2024-11-20 08:00:00',
  })
  lessonStartDateTime: string;
}

export class CreateLessonResDto extends Http2xxBase {
  @ApiProperty({
    description: '신청 결과 리턴',
    example: [
      {
        id: '3d8a0f13-1ac3-4f9d-aa64-85eb65a9d76b',
        password: 'kAl4Ls79',
        lessonStartDateTime: '2024-11-20 08:00:00',
      },
    ],
    type: [ResponseDataDto],
  })
  @Type(() => ResponseDataDto)
  data: ResponseDataDto;
}
