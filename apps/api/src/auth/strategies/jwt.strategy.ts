import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus, type UserRole } from '@muslim-tech/types';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../types/authenticated-user';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Re-checks the account on every request rather than trusting the token
   * alone. Without this, suspending or deleting a student leaves them with a
   * fully working session until their access token expires — the admin's
   * "إيقاف" button would look like it did nothing for up to 15 minutes.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('الحساب لم يعد موجودًا');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('هذا الحساب موقوف حاليًا');
    }

    return { id: user.id, role: user.role as UserRole };
  }
}
