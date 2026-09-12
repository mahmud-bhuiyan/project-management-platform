import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class DemoLoginDto {
  @ApiProperty({ example: 'admin@acme.dev' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
