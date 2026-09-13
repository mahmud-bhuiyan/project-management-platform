import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good — please add mobile breakpoints.' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
