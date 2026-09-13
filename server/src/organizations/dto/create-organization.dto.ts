import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Technologies' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'acme-technologies',
    description:
      'Optional URL slug. Auto-generated from name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  slug?: string;
}
