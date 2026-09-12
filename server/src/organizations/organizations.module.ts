import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [UsersModule],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
