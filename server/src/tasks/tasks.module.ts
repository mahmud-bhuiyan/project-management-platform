import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { UsersModule } from '../users/users.module.js';
import { ActivityLogController } from './activity-log.controller.js';
import { ActivityLogService } from './activity-log.service.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { SubtasksController } from './subtasks.controller.js';
import { SubtasksService } from './subtasks.service.js';
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
  controllers: [
    TasksController,
    SubtasksController,
    CommentsController,
    ActivityLogController,
  ],
  providers: [
    TasksService,
    SubtasksService,
    CommentsService,
    ActivityLogService,
    JwtAuthGuard,
  ],
  exports: [
    TasksService,
    SubtasksService,
    CommentsService,
    ActivityLogService,
  ],
})
export class TasksModule {}
