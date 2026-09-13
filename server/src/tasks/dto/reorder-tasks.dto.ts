import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderTaskItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  taskId!: string;

  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderTasksDto {
  @ApiProperty({ type: [ReorderTaskItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderTaskItemDto)
  items!: ReorderTaskItemDto[];
}
