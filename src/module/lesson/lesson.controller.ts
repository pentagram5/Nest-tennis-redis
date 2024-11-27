import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import {
  CreateLessonReqDto,
  CreateLessonResDto,
} from './dto/create-lesson.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  Http2xxBase,
  Http422Dto,
  Http4XXDto,
  HttpError400Dto,
} from '../../dto/http-response.dto';
import {
  LessonSearchAllReqDto,
  LessonSearchAllResDto,
  LessonSearchParamReqDto,
  LessonSearchQueryReqDto,
  LessonSearchResDto,
} from './dto/read-lesson.dto';
import {
  UpdateLessonParamDto,
  UpdateLessonReqBodyDto,
} from './dto/update-lesson.dto';
import {
  LessonRemoveQueryReqDto,
  LessonRemoveReqDto,
} from './dto/remove-lesson.dto';

@ApiNotFoundResponse({
  description: '해당 리소스 없음',
  type: Http4XXDto,
})
@ApiBadRequestResponse({
  description: '잘못된 요청 인자.',
  type: HttpError400Dto,
})
@ApiUnprocessableEntityResponse({
  description:
    '요청에 대한 리소스 조회 결과가 없거나, 비즈니스로직 상 신청 불가한 경우',
  type: Http422Dto,
})
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @ApiOperation({
    summary: '레슨가능 일정 정보 조회',
    description:
      '<strong>기능 설명:</strong><br>\n' +
      '<dd> 강사 이름, 레슨종류, 주 레슨횟수, 레슨 시간을 입력받아 조건에 부합하는 레슨가능 일정을 YYYY-MM-DD HH:mm:ss 형식으로 리턴합니다.</dd><br>\n' +
      '<strong>입력 항목(Query Param):</strong><br>\n' +
      '<ul>\n' +
      '  <li>강사 이름 (`coach`) : 조회할 강사의 이름입니다.(김민준, 오서준, 이도윤, 박예준 중 택)</li>\n' +
      '  <li>수업 유형 (`lessonType`) : 수업 유형을 기입합니다.(one_time 또는 regular 중 택)</li>\n' +
      '  <li>주 수업 횟수(`frequency`) : 주 수업 횟수를 기입합니다.(1,2,3 중 택)</li>\n' +
      '  <li>수업 시간(`duration`) : 수업 시간을 기입합니다.(30, 60 중 선택)</li>\n' +
      '</ul><br>' +
      '\n' +
      '<strong>레슨 일정 조회 조건</strong><br>\n' +
      '<ul>\n' +
      '  <li>현재 등록된 레슨별 스케줄(정기일 경우 day+1 ~7일 사이의 요일 별 시간 스케줄, 1회성인 경우 start_date가 day+1~7일 사이 인 경우의 시간스케줄)를 기준으로 합니다.</li>\n' +
      '  <li>1. 강사이름 기준 이미 활성화 되고 등록된 스케줄은 전체일정(day+1~7일: 0700~22:30) 에서 제외합니다.</li>\n' +
      '  <li>2. 주말의 경우 가용가능한 코트수가 3개로 강사수(4명)보다 적기 때문에, 해당 강사 외 스케줄의 동일 시간에 3개이상 예약된 경우를 제외합니다.</li>\n' +
      '  <li>3. 상기 제외된 스케줄을 기준으로, 수업유형, 수업 횟수, 수업 시간에 따른 남은 일정을 확인 후 일정을 리턴합니다.</li>\n' +
      '  <li>현재 등록된 레슨별 스케줄(정기일 경우 day+1 ~7일 사이의 요일 별 시간 스케줄, 1회성인 경우 start_date가 day+1~7일 사이 인 경우의 시간스케줄)를 기준으로 합니다.</li>\n' +
      '</ul>',
  })
  @ApiOkResponse({
    description: '데이터 조회 성공',
    type: LessonSearchAllResDto,
  })
  @Get()
  findAll(@Query() lessonSearchAllDto: LessonSearchAllReqDto) {
    return this.lessonService.findAll(lessonSearchAllDto);
  }

  @ApiOperation({
    summary: '레슨 신청',
    description:
      '<strong>기능 설명:</strong><br>\n' +
      '<dd> 강사 이름, 레슨종류, 주 레슨횟수, 레슨 시간, 고객이름, 전화번호, 신청 요일+시간 배열을 입력받아 레슨을 신청하고, 신청 성공 시 레슨id, 패스워드, 레슨 시작 일자를 리턴합니다. </dd><br>\n' +
      '<strong>신청 제약 조건(고객 이름, 전화번호 기준):</strong><br>\n' +
      '<ul>\n' +
      '  <li>강사 이름과 무관하게, 이미 활성화된 정기레슨이 있는 경우 추가 신청 불가합니다.</li>\n' +
      '  <li>1회 레슨이 day+1~7일 이내 예정되있는 경우 신청 불가합니다.</li>\n' +
      '  <li>강사 이름과 무관하게, 1회 레슨을 이미 받은 고객은 정기레슨만 신청가능합니다.</li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(body):</strong><br>\n' +
      '<ul>\n' +
      '  <li>강사 이름 (`coach`) : 조회할 강사의 이름입니다.(김민준, 오서준, 이도윤, 박예준 중 택)</li>\n' +
      '  <li>수업 유형 (`lessonType`) : 수업 유형을 기입합니다.(one_time 또는 regular 중 택)</li>\n' +
      '  <li>주 수업 횟수(`frequency`) : 주 수업 횟수를 기입합니다.(1,2,3 중 택)</li>\n' +
      '  <li>수업 시간(`duration`) : 수업 시간을 기입합니다.(30, 60 중 선택)</li>\n' +
      '  <li>고객 이름(`name`) : 고객이름을 기입합니다.</li>\n' +
      '  <li>전화번호(`phoneNumber`) : 전화번호를 기입합니다.(하이픈 제외)</li>\n' +
      '  <li>신청 일자 목록(`requestDate`) : { 요일(day) : 신청요일, (0:일요일 , 1:월요일, 2:화요일, 3:수요일, 4:목요일, 5:금요일, 6:일요일) , 시간(time}:HH:mm:ss 형식이어야 하며 HH는 07~22, mm은 30 또는 60만 가능}의 오브젝트를 배열에 담아 요청합니다.</li>\n' +
      '</ul><br>',
  })
  @ApiCreatedResponse({
    description: '레슨 신청 성공',
    type: CreateLessonResDto,
  })
  @Post()
  create(
    @Body() createLessonReqDto: CreateLessonReqDto,
  ): Promise<CreateLessonResDto> {
    if (createLessonReqDto.frequency != createLessonReqDto.requestDate.length) {
      throw new BadRequestException({
        success: false,
        message:
          '요청받은 신청 요일+시간 목록이 주 수업회수와 맞지 않습니다. 신청요일+시간 개수를 조정해주세요',
      });
    }
    if (
      createLessonReqDto.lessonType == 'one_time' &&
      createLessonReqDto.frequency > 1
    ) {
      throw new BadRequestException({
        success: false,
        message:
          '1회 체만 레슨은 신청요일+시간을 하루만 지정해야합니다. 신청요일+시간 개수를 조정해주세요 ',
      });
    }
    return this.lessonService.create(createLessonReqDto);
  }

  @ApiForbiddenResponse({
    description: '비밀번호 맞지않음',
    type: Http4XXDto,
  })
  @ApiOperation({
    summary: '레슨 상세 조회',
    description:
      '<strong>기능 설명:</strong><br>\n' +
      '<dd> 레슨 id, 패스워드를 입력받아 해당 레슨의 상세정보를 조회합니다. </dd><br>\n' +
      '<strong>조회 조건:</strong><br>\n' +
      '<ul>\n' +
      '  <li>해당하는 레슨이 존재하고, 패스워드가 일치할 시 조회가능합니다..</li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(param):</strong><br>\n' +
      '<ul>\n' +
      '  <li회>레슨 id (`id`) : 조회 대상 레슨 id(uuid)</li회>\n' +
      '</ul><br>' +
      '<strong>입력 항목(query):</strong><br>\n' +
      '<ul>\n' +
      '  <li>패스워드(`passwor드d`) : 레슨 등록 시 전달받은 패스워드</li>\n' +
      '</ul><br>',
  })
  @ApiOkResponse({
    description: '레슨데이터 조회 성공',
    type: LessonSearchResDto,
  })
  @Get(':id')
  findOne(
    @Param() paramReqDto: LessonSearchParamReqDto,
    @Query() queryReqDto: LessonSearchQueryReqDto,
  ): Promise<LessonSearchResDto> {
    const { id } = paramReqDto;
    const { password } = queryReqDto;
    return this.lessonService.findOne(id, password);
  }

  @ApiOkResponse({
    description: '레슨 수정 성공',
    type: Http2xxBase,
  })
  @ApiOperation({
    summary: '레슨 수정',
    description:
      '<strong>기능 설명:</strong><br>\n' +
      '<dd> 레슨 id, 패스워드,고객 이름, 고객 전화번호, 코치 이름, 주 몇회, 요일+시간 리스트, 소요 시간를 입력받아 조건에 부합하는 레슨을 수정합니다. </dd><br>\n' +
      '<strong>수정 제약 조건:</strong><br>\n' +
      '<ul>\n' +
      '  <li> 레슨 신청 시의 제약조건과  동일합니다. </li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(param):</strong><br>\n' +
      '<ul>\n' +
      '  <li>레슨 id (`id`) : 취소 대상 레슨 id(uuid)</li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(body):</strong><br>\n' +
      '<ul>\n' +
      '  <li>패스워드(`password`) : 레슨 등록 시 전달받은 패스워드</li>\n' +
      '  <li>이 외의 레슨 수정 내용은 레슨 신청의 입력항목과 동일합니다.</li>\n' +
      '</ul><br>',
  })
  @Patch(':id')
  update(
    @Param() updateLessonParamDto: UpdateLessonParamDto,
    @Body() updateLessonBodyDto: UpdateLessonReqBodyDto,
  ): Promise<Http2xxBase> {
    if (
      updateLessonBodyDto.frequency != updateLessonBodyDto.requestDate.length
    ) {
      throw new BadRequestException({
        success: false,
        message:
          '요청받은 신청 요일+시간 목록이 주 수업회수와 맞지 않습니다. 신청요일+시간 개수를 조정해주세요',
      });
    }
    if (
      updateLessonBodyDto.lessonType == 'one_time' &&
      updateLessonBodyDto.frequency > 1
    ) {
      throw new BadRequestException({
        success: false,
        message:
          '1회 체만 레슨은 신청요일+시간을 하루만 지정해야합니다. 신청요일+시간 개수를 조정해주세요 ',
      });
    }
    return this.lessonService.update(
      updateLessonParamDto.id,
      updateLessonBodyDto,
    );
  }

  @ApiOperation({
    summary: '레슨 취소',
    description:
      '<strong>기능 설명:</strong><br>\n' +
      '<dd> 레슨 id, 패스워드를 입력받아 해당 레슨을 취소합니다. </dd><br>\n' +
      '<strong>취소 제약 조건:</strong><br>\n' +
      '<ul>\n' +
      '  <li>당일에 예정된 레슨이 있는 경우는 취소가 불가합니다.</li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(param):</strong><br>\n' +
      '<ul>\n' +
      '  <li>레슨 id (`id`) : 취소 대상 레슨 id(uuid)</li>\n' +
      '</ul><br>' +
      '<strong>입력 항목(query):</strong><br>\n' +
      '<ul>\n' +
      '  <li>패스워드(`password`) : 레슨 등록 시 전달받은 패스워드</li>\n' +
      '</ul><br>',
  })
  @ApiOkResponse({
    description: '레슨 취소 성공',
    type: Http2xxBase,
  })
  @Delete(':id')
  remove(
    @Param() paramReqDto: LessonRemoveReqDto,
    @Query() queryReqDto: LessonRemoveQueryReqDto,
  ) {
    const { id } = paramReqDto;
    const { password } = queryReqDto;
    return this.lessonService.remove(id, password);
  }
}
