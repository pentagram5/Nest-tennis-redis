import { ApiProperty } from '@nestjs/swagger';

export class HttpError400Dto {
  @ApiProperty({ description: '성공여부-false' })
  success: boolean;

  @ApiProperty({ description: '실패매세지' })
  message: string;
}

export class Http4XXDto {
  @ApiProperty({ description: '성공여부-false' })
  success: boolean;

  @ApiProperty({ description: '실패매세지' })
  message: string;
}

export class Http422Dto {
  @ApiProperty({ description: '성공여부-false' })
  success: boolean;

  @ApiProperty({ description: '실패매세지' })
  message: string; // 실패 메시지
}

export class Http2xxBase {
  @ApiProperty({ description: '성공여부-true' })
  success: boolean;
}
