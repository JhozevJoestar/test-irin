import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, AuthRequest } from './auth.guard';
import { LoginDto } from './dto';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure:
    process.env.NODE_ENV === 'production' ||
    process.env.COOKIE_SECURE === 'true',
  path: '/',
});
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, csrf } = await this.auth.login(body, req.ip ?? 'unknown');
    res.cookie('session', token, {
      ...cookieOptions(),
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { csrf };
  }
  @UseGuards(AuthGuard) @Get('me') me(@Req() req: AuthRequest) {
    return { ...req.user, csrf: req.csrf };
  }
  @UseGuards(AuthGuard) @Post('logout') logout(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('session', cookieOptions());
    return { ok: true };
  }
}
