import {
  Injectable,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AnalyticsService } from './analytics.service';
import { SessionUser } from './auth.service';
import { SyncDto } from './dto';
import { MockGeoProvider } from './provider';
import { period, DAY } from './period';
@Injectable()
export class IntegrationsService {
  constructor(
    private db: PrismaService,
    private analytics: AnalyticsService,
    private provider: MockGeoProvider,
  ) {}
  async sync(user: SessionUser, input: SyncDto) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Требуется роль ADMIN');
    await this.analytics.branch(user, input.branchId);
    const { start, end } = period(input.from, input.to);
    try {
      const rows = await this.provider.fetch(input.branchId, start, end);
      const seen = new Set<string>();
      for (const row of rows) {
        if (
          !(row.date instanceof Date) ||
          !Number.isFinite(row.date.getTime()) ||
          row.date < start ||
          row.date > end ||
          row.date.getTime() % DAY !== 0 ||
          [row.views, row.websiteClicks, row.calls, row.routes].some(
            (v) => !Number.isSafeInteger(v) || v < 0 || v > 2147483647,
          )
        )
          throw new Error('Некорректные данные провайдера');
        const key = row.date.toISOString();
        if (seen.has(key)) throw new Error('Дубли дат у провайдера');
        seen.add(key);
      }
      if (rows.length !== (end.getTime() - start.getTime()) / DAY + 1)
        throw new Error('Неполный ответ провайдера');
      await this.db.$transaction(
        rows.map((row) =>
          this.db.dailyMetric.upsert({
            where: {
              branchId_date: { branchId: input.branchId, date: row.date },
            },
            create: { branchId: input.branchId, ...row },
            update: row,
          }),
        ),
      );
      return {
        processed: rows.length,
        branchId: input.branchId,
        from: input.from,
        to: input.to,
        message: 'Синхронизация завершена',
      };
    } catch {
      throw new BadGatewayException(
        'Ошибка синхронизации: изменения не сохранены. Повторите запрос.',
      );
    }
  }
}
