import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { SessionUser } from './auth.service';
import { FiltersDto } from './dto';
import { period, DAY } from './period';
@Injectable()
export class AnalyticsService {
  constructor(private db: PrismaService) {}
  scope(user: SessionUser, companyId?: string): Prisma.BranchWhereInput {
    if (user.role === 'CLIENT') {
      if (!user.companyId || (companyId && companyId !== user.companyId))
        throw new ForbiddenException('Нет доступа к компании');
      return { companyId: user.companyId };
    }
    return companyId ? { companyId } : {};
  }
  companies(user: SessionUser) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Требуется роль ADMIN');
    return this.db.company.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { branches: true } } },
    });
  }
  branches(user: SessionUser, filter: FiltersDto) {
    return this.db.branch.findMany({
      where: this.scope(user, filter.companyId),
      include: { company: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }
  async branch(user: SessionUser, id: string) {
    const branch = await this.db.branch.findFirst({
      where: { ...this.scope(user), id },
      include: { company: { select: { name: true } } },
    });
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }
  async selection(user: SessionUser, filter: FiltersDto) {
    const scope = this.scope(user, filter.companyId);
    if (filter.branchId) {
      const found = await this.db.branch.findFirst({
        where: { ...scope, id: filter.branchId },
      });
      if (!found) throw new NotFoundException('Филиал не найден');
    }
    return { ...scope, ...(filter.branchId ? { id: filter.branchId } : {}) };
  }
  async summary(user: SessionUser, filter: FiltersDto) {
    const branch = await this.selection(user, filter);
    const { start, end, exclusiveEnd } = period(filter.from, filter.to);
    const [metrics, reviews] = await this.db.$transaction([
      this.db.dailyMetric.aggregate({
        where: { branch, date: { gte: start, lte: end } },
        _sum: { views: true, websiteClicks: true, calls: true, routes: true },
      }),
      this.db.review.aggregate({
        where: {
          branch,
          createdAt: { gte: start, lt: exclusiveEnd },
          status: 'PUBLISHED',
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);
    return {
      views: metrics._sum.views ?? 0,
      websiteClicks: metrics._sum.websiteClicks ?? 0,
      calls: metrics._sum.calls ?? 0,
      routes: metrics._sum.routes ?? 0,
      averageRating: reviews._avg.rating,
      reviewsCount: reviews._count.id,
    };
  }
  async timeseries(user: SessionUser, filter: FiltersDto) {
    const branch = await this.selection(user, filter);
    const { start, end } = period(filter.from, filter.to);
    const rows = await this.db.dailyMetric.groupBy({
      by: ['date'],
      where: { branch, date: { gte: start, lte: end } },
      _sum: { views: true, websiteClicks: true, calls: true, routes: true },
      orderBy: { date: 'asc' },
    });
    const grouped = new Map(
      rows.map((row) => [row.date.toISOString().slice(0, 10), row._sum]),
    );
    const result = [];
    for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
      const date = new Date(t).toISOString().slice(0, 10);
      const r = grouped.get(date);
      result.push({
        date,
        views: r?.views ?? 0,
        websiteClicks: r?.websiteClicks ?? 0,
        calls: r?.calls ?? 0,
        routes: r?.routes ?? 0,
      });
    }
    return result;
  }
}
