import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ProjectsModule } from '../projects/projects.module.js';
import { ProjectsGateway } from './projects.gateway.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';

@Module({
  imports: [
    ProjectsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [ProjectsGateway, RealtimeEmitterService],
  exports: [RealtimeEmitterService],
})
export class RealtimeModule {}
