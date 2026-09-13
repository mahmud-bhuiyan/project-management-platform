import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OrganizationRoleGuard } from './guards/organization-role.guard.js';
import { UsersModule } from '../users/users.module.js';
import { OrganizationMembersController } from './organization-members.controller.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [
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
  controllers: [OrganizationsController, OrganizationMembersController],
  providers: [OrganizationsService, JwtAuthGuard, OrganizationRoleGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
