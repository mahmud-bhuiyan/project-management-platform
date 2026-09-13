import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class AddOrganizationMemberDto {
  @ApiProperty({ example: 'member@acme.dev' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
    description: 'Cannot assign OWNER when adding a member',
  })
  @IsOptional()
  @IsEnum(OrganizationRole)
  @NotEquals(OrganizationRole.OWNER, {
    message: 'Cannot assign OWNER when adding a member',
  })
  role?: OrganizationRole;
}
