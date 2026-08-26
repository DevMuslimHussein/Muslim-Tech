import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { UserStatus } from '@muslim-tech/types';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import type { AuthenticatedUser } from './types/authenticated-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  async register(
    fullName: string,
    username: string,
    email: string,
    password: string,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const [byEmail, byUsername] = await Promise.all([
      this.users.findByEmail(email),
      this.users.findByUsername(username),
    ]);

    if (byEmail) {
      throw new ConflictException('هذا البريد الإلكتروني مستخدم بالفعل');
    }
    if (byUsername) {
      throw new ConflictException('اسم المستخدم هذا مستخدم بالفعل');
    }

    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { fullName, username, email, passwordHash, role: 'student' },
    });

    return this.issueTokenPair(
      { id: user.id, role: user.role },
      deviceInfo,
      ip,
    );
  }

  async login(
    identifier: string,
    password: string,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('هذا الحساب موقوف حاليًا');
    }

    await this.users.touchLastLogin(user.id);

    return this.issueTokenPair(
      { id: user.id, role: user.role },
      deviceInfo,
      ip,
    );
  }

  async refresh(
    refreshToken: string,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'جلسة غير صالحة، الرجاء تسجيل الدخول مجددًا',
      );
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedException(
        'جلسة غير صالحة، الرجاء تسجيل الدخول مجددًا',
      );
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('هذا الحساب موقوف حاليًا');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(
      { id: user.id, role: user.role },
      deviceInfo,
      ip,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(user: AuthenticatedUser) {
    const record = await this.users.findById(user.id);
    if (!record) {
      throw new UnauthorizedException();
    }
    return {
      id: record.id,
      fullName: record.fullName,
      username: record.username,
      email: record.email,
      phone: record.phone,
      avatarUrl: record.avatarUrl,
      role: record.role,
      status: record.status,
      createdAt: record.createdAt,
      lastLoginAt: record.lastLoginAt,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Do not reveal whether the email exists.
      return;
    }

    const rawToken = randomUUID();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${this.config.get<string>('APP_URL', 'https://app.muslimtech.local')}/reset-password?token=${rawToken}`;
    await this.mailer.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'رابط إعادة التعيين غير صالح أو منتهي الصلاحية',
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async issueTokenPair(
    user: AuthenticatedUser,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const accessExpiresInMs = msFromDuration(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresInMs / 1000,
      },
    );

    const refreshExpiresInMs = msFromDuration(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresInMs / 1000,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        deviceInfo,
        ip,
        expiresAt: new Date(Date.now() + refreshExpiresInMs),
      },
    });

    return { accessToken, refreshToken };
  }
}

function msFromDuration(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const [, amountStr, unit] = match as unknown as [
    string,
    string,
    's' | 'm' | 'h' | 'd',
  ];
  const amount = Number(amountStr);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return amount * unitMs;
}
