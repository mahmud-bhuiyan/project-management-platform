import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetDashboardStatsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;
}
