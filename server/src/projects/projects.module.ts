import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { UsersModule } from '../users/users.module.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [
    OrganizationsModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [ProjectsController, ProjectMembersController],
  providers: [
    ProjectsService,
    ProjectMembersService,
    JwtAuthGuard,
    OrganizationRoleGuard,
  ],
  exports: [ProjectsService, ProjectMembersService],
})
export class ProjectsModule {}
