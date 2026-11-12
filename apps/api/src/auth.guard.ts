import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, SessionUser } from './auth.service';
export interface AuthRequest extends Request {
  user: SessionUser;
  csrf: string;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const token: unknown = req.cookies?.session;
    if (typeof token !== 'string')
      throw new UnauthorizedException('Войдите в аккаунт');
    const session = await this.auth.verify(token);
    req.user = session.user;
    req.csrf = session.csrf;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers['x-csrf-token'] !== session.csrf
    )
      throw new ForbiddenException('Неверный CSRF-токен');
    return true;
  }
}
