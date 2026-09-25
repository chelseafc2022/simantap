import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operasi berhasil dilaksanakan' })
  message: string;

  data?: T;

  @ApiPropertyOptional()
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };

  @ApiProperty({ example: '2026-09-25T14:00:00.000Z' })
  timestamp: string;
}
