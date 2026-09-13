import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: 'Updated: please add mobile breakpoints and copy review.' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
