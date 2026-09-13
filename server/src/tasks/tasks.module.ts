import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { UsersModule } from '../users/users.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [
    OrganizationsModule,
    ProjectsModule,
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
  controllers: [TasksController],
  providers: [TasksService, JwtAuthGuard],
  exports: [TasksService],
})
export class TasksModule {}
