import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThemePreference } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyAdminDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Acme Admin' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Acme Technologies' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  organizationName!: string;

  @ApiProperty({ example: 'acme-technologies' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'organizationSlug must be lowercase letters, numbers, and hyphens',
  })
  organizationSlug!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: ThemePreference, default: ThemePreference.LIGHT })
  @IsOptional()
  @IsEnum(ThemePreference)
  themePreference?: ThemePreference;
}
