import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { hashPassword } from '../common/utils/password.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateUserInput, SafeUser } from './users.types.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const passwordHash = await hashPassword(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        avatarUrl: input.avatarUrl,
        themePreference: input.themePreference,
      },
    });

    return this.toSafeUser(user);
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
