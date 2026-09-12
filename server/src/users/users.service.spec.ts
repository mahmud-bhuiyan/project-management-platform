import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

const mockUser: User = {
  id: 'user-1',
  email: 'alex@example.com',
  passwordHash: 'hashed-password',
  name: 'Alex',
  avatarUrl: null,
  platformRole: 'USER',
  themePreference: 'LIGHT',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UsersService', () => {
  let usersService: UsersService;

  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  it('findByEmail normalizes email to lowercase', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const user = await usersService.findByEmail('Alex@Example.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'alex@example.com' },
    });
    expect(user).toEqual(mockUser);
  });

  it('findById returns user from prisma', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const user = await usersService.findById('user-1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
    expect(user).toEqual(mockUser);
  });

  it('create hashes password and returns safe user', async () => {
    prisma.user.create.mockResolvedValue(mockUser);

    const user = await usersService.create({
      email: 'Alex@Example.com',
      name: 'Alex',
      password: 'secret-password',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alex@example.com',
        name: 'Alex',
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      },
    });
    expect(user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      avatarUrl: mockUser.avatarUrl,
      platformRole: mockUser.platformRole,
      themePreference: mockUser.themePreference,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('create accepts optional avatar and theme preference', async () => {
    const userWithAvatar: User = {
      ...mockUser,
      avatarUrl: 'https://example.com/avatar.png',
      themePreference: 'DARK',
    };
    prisma.user.create.mockResolvedValue(userWithAvatar);

    const user = await usersService.create({
      email: 'alex@example.com',
      name: 'Alex',
      password: 'secret-password',
      avatarUrl: 'https://example.com/avatar.png',
      themePreference: 'DARK',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alex@example.com',
        name: 'Alex',
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
        avatarUrl: 'https://example.com/avatar.png',
        themePreference: 'DARK',
      },
    });
    expect(user.avatarUrl).toBe('https://example.com/avatar.png');
    expect(user.themePreference).toBe('DARK');
  });

  it('toSafeUser strips passwordHash', () => {
    const safeUser = usersService.toSafeUser(mockUser);

    expect(safeUser).not.toHaveProperty('passwordHash');
    expect(safeUser.email).toBe(mockUser.email);
  });
});
