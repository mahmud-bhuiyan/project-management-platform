import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../auth/auth.types.js';
import type { AuthUser } from '../common/types/authenticated-request.types.js';
import { ProjectsService } from '../projects/projects.service.js';
import { JoinProjectDto } from './dto/join-project.dto.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';
import type { ProjectRoomAck } from './realtime.types.js';
import { projectRoomId } from './utils/project-room.util.js';
import { userRoomId } from './utils/user-room.util.js';
import { extractSocketToken } from './utils/ws-auth.util.js';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProjectsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(ProjectsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly projectsService: ProjectsService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  afterInit(): void {
    this.realtimeEmitter.setServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = extractSocketToken(client);
    if (!token) {
      this.logger.warn(`Rejected socket ${client.id}: missing access token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user = {
        id: payload.sub,
        email: payload.email,
        platformRole: payload.platformRole,
      } satisfies AuthUser;
      client.data.user = user;
      await client.join(userRoomId(user.id));
      this.logger.debug(`Socket connected: ${client.id} (${payload.email})`);
    } catch {
      this.logger.warn(`Rejected socket ${client.id}: invalid access token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as AuthUser | undefined;
    this.logger.debug(
      `Socket disconnected: ${client.id}${user ? ` (${user.email})` : ''}`,
    );
  }

  @SubscribeMessage('project:join')
  async joinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinProjectDto,
  ): Promise<ProjectRoomAck> {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      return { ok: false, error: 'UNAUTHORIZED' };
    }

    try {
      await this.projectsService.assertCanAccessProject(
        user.id,
        payload.organizationId,
        payload.projectId,
      );
    } catch {
      return { ok: false, error: 'FORBIDDEN' };
    }

    const room = projectRoomId(payload.projectId);
    await client.join(room);
    this.logger.debug(
      `Socket ${client.id} joined ${room} (${user.email})`,
    );

    return { ok: true, room };
  }

  @SubscribeMessage('project:leave')
  async leaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinProjectDto,
  ): Promise<ProjectRoomAck> {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      return { ok: false, error: 'UNAUTHORIZED' };
    }

    const room = projectRoomId(payload.projectId);
    await client.leave(room);
    this.logger.debug(`Socket ${client.id} left ${room} (${user.email})`);

    return { ok: true, room };
  }
}
