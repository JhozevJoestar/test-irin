import {
  Injectable,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { compare, hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto';
export type SessionUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
};
@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; until: number }>();
  private dummyHash = hashSync('dummy-password-never-used', 10);
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  async login(input: LoginDto, ip: string) {
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.until < now) this.attempts.delete(key);
    const attempt = this.attempts.get(ip) ?? {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    if (attempt.count >= 10)
      throw new HttpException(
        'Слишком много попыток. Повторите через 15 минут.',
        429,
      );
    attempt.count++;
    this.attempts.set(ip, attempt);
    const user = await this.db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    const valid = await compare(
      input.password,
      user?.passwordHash ?? this.dummyHash,
    );
    if (!user || !valid)
      throw new UnauthorizedException('Неверный email или пароль');
    const csrf = randomBytes(32).toString('hex');
    return { token: await this.jwt.signAsync({ sub: user.id, csrf }), csrf };
  }
  async verify(token: string): Promise<{ user: SessionUser; csrf: string }> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; csrf: string }>(
        token,
      );
      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, companyId: true },
      });
      if (!user || (user.role === 'CLIENT' && !user.companyId))
        throw new Error();
      return { user, csrf: payload.csrf };
    } catch {
      throw new UnauthorizedException('Войдите в аккаунт');
    }
  }
}
