import { IsUUID } from 'class-validator';

export class JoinProjectDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  projectId!: string;
}
