import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import type { MailerService } from '../mailer/mailer.service';

function buildService(overrides?: { user?: Record<string, unknown> | null }) {
  const existingUser = overrides?.user ?? {
    id: 'user-1',
    username: 'student1',
    email: 'student@example.com',
    passwordHash: '',
    role: 'student',
    status: 'active',
  };

  const createdUserData: { current?: Record<string, unknown> } = {};

  const prisma = {
    user: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) => {
          createdUserData.current = data;
          return Promise.resolve({ id: 'new-user', role: 'student', ...data });
        }),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const users = {
    findByEmail: jest.fn().mockResolvedValue(existingUser),
    findByUsername: jest.fn().mockResolvedValue(null),
    findByIdentifier: jest.fn().mockResolvedValue(existingUser),
    findById: jest.fn().mockResolvedValue(existingUser),
    touchLastLogin: jest.fn().mockResolvedValue(undefined),
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  };

  const config = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };

  const mailer = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    users as unknown as UsersService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    mailer as unknown as MailerService,
  );
  return { service, prisma, users, jwt, config, mailer, createdUserData };
}

describe('AuthService.login', () => {
  it('rejects an unknown identifier', async () => {
    const { service, users } = buildService();
    users.findByIdentifier.mockResolvedValue(null);

    await expect(
      service.login('nobody@example.com', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an incorrect password', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const { service } = buildService({
      user: { id: 'user-1', role: 'student', status: 'active', passwordHash },
    });

    await expect(
      service.login('student@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a suspended account even with the correct password', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const { service } = buildService({
      user: {
        id: 'user-1',
        role: 'student',
        status: 'suspended',
        passwordHash,
      },
    });

    await expect(
      service.login('student@example.com', 'correct-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('issues a token pair and stores the refresh token on success', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const { service, prisma, users } = buildService({
      user: { id: 'user-1', role: 'student', status: 'active', passwordHash },
    });

    const tokens = await service.login(
      'student@example.com',
      'correct-password',
    );

    expect(tokens).toEqual({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
    });
    expect(users.touchLastLogin).toHaveBeenCalledWith('user-1');
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('accepts a username as the identifier too', async () => {
    const passwordHash = await argon2.hash('correct-password');
    const { service, users } = buildService({
      user: { id: 'user-1', role: 'student', status: 'active', passwordHash },
    });

    await service.login('student1', 'correct-password');

    expect(users.findByIdentifier).toHaveBeenCalledWith('student1');
  });
});

describe('AuthService.register', () => {
  it('rejects a duplicate email', async () => {
    const { service, users } = buildService();
    users.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register(
        'طالب جديد',
        'newstudent',
        'taken@example.com',
        'password123',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a duplicate username', async () => {
    const { service, users } = buildService();
    users.findByEmail.mockResolvedValue(null);
    users.findByUsername.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register('طالب جديد', 'taken', 'new@example.com', 'password123'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the student and issues a token pair', async () => {
    const { service, users, createdUserData } = buildService();
    users.findByEmail.mockResolvedValue(null);
    users.findByUsername.mockResolvedValue(null);

    const tokens = await service.register(
      'طالب جديد',
      'newstudent',
      'new@example.com',
      'password123',
    );

    expect(tokens).toEqual({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
    });

    expect(createdUserData.current?.fullName).toBe('طالب جديد');
    expect(createdUserData.current?.username).toBe('newstudent');
    expect(createdUserData.current?.email).toBe('new@example.com');
    expect(createdUserData.current?.role).toBe('student');
  });
});
