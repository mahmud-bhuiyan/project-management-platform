import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.ADMIN })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
