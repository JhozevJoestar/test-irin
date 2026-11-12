import { Module, Controller, Get } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { DataController } from './data.controller';
import { AnalyticsService } from './analytics.service';
import { IntegrationsService } from './integrations.service';
import { MockGeoProvider } from './provider';
@Controller('health')
class HealthController {
  constructor(private db: PrismaService) {}
  @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32)
          throw new Error('JWT_SECRET must contain at least 32 characters');
        return { secret, signOptions: { expiresIn: '8h' } };
      },
    }),
  ],
  controllers: [AuthController, DataController, HealthController],
  providers: [
    PrismaService,
    AuthService,
    AuthGuard,
    AnalyticsService,
    IntegrationsService,
    MockGeoProvider,
  ],
})
export class AppModule {}
