import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsService } from '../projects/projects.service.js';
import { ProjectsGateway } from './projects.gateway.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';

const authUser = {
  id: 'user-1',
  email: 'admin@acme.dev',
  platformRole: 'USER',
};

function createSocket(overrides: Partial<Socket> = {}): Socket {
  const disconnect = vi.fn();
  const join = vi.fn().mockResolvedValue(undefined);
  const leave = vi.fn().mockResolvedValue(undefined);

  return {
    id: 'socket-1',
    handshake: {
      auth: {},
      query: {},
      headers: {},
    },
    data: {},
    disconnect,
    join,
    leave,
    ...overrides,
  } as unknown as Socket;
}

describe('ProjectsGateway', () => {
  let gateway: ProjectsGateway;

  const jwtService = {
    verifyAsync: vi.fn(),
  };

  const projectsService = {
    assertCanAccessProject: vi.fn(),
  };

  const realtimeEmitter = {
    setServer: vi.fn(),
    emitTaskReordered: vi.fn(),
    emitCommentCreated: vi.fn(),
    emitNotificationCreated: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ProjectsService, useValue: projectsService },
        { provide: RealtimeEmitterService, useValue: realtimeEmitter },
      ],
    }).compile();

    gateway = module.get(ProjectsGateway);
  });

  it('registers the gateway server with the realtime emitter', () => {
    gateway.server = { id: 'server-1' } as never;

    gateway.afterInit();

    expect(realtimeEmitter.setServer).toHaveBeenCalledWith(gateway.server);
  });

  it('accepts a connection with a valid JWT', async () => {
    const client = createSocket({
      handshake: {
        auth: { token: 'valid-token' },
        query: {},
        headers: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({
      sub: authUser.id,
      email: authUser.email,
      platformRole: authUser.platformRole,
    });

    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(client.data.user).toEqual(authUser);
    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects a connection without a token', async () => {
    const client = createSocket();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a connection with an invalid JWT', async () => {
    const client = createSocket({
      handshake: {
        auth: { token: 'invalid-token' },
        query: {},
        headers: {},
      },
    });
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('joins a project room when the user can access the project', async () => {
    const client = createSocket();
    client.data.user = authUser;
    projectsService.assertCanAccessProject.mockResolvedValue(undefined);

    const result = await gateway.joinProject(client, {
      organizationId: 'org-1',
      projectId: 'project-1',
    });

    expect(projectsService.assertCanAccessProject).toHaveBeenCalledWith(
      authUser.id,
      'org-1',
      'project-1',
    );
    expect(client.join).toHaveBeenCalledWith('project:project-1');
    expect(result).toEqual({ ok: true, room: 'project:project-1' });
  });

  it('returns forbidden when the user cannot access the project', async () => {
    const client = createSocket();
    client.data.user = authUser;
    projectsService.assertCanAccessProject.mockRejectedValue(
      new Error('forbidden'),
    );

    const result = await gateway.joinProject(client, {
      organizationId: 'org-1',
      projectId: 'project-1',
    });

    expect(client.join).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('leaves a project room', async () => {
    const client = createSocket();
    client.data.user = authUser;

    const result = await gateway.leaveProject(client, {
      organizationId: 'org-1',
      projectId: 'project-1',
    });

    expect(client.leave).toHaveBeenCalledWith('project:project-1');
    expect(result).toEqual({ ok: true, room: 'project:project-1' });
  });
});
