import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma.service';
import { MockGeoProvider } from '../src/provider';
describe('PostgreSQL API integration', () => {
  let app: INestApplication;
  let db: PrismaService;
  let clientCookie: string;
  let adminCookie: string;
  let csrf: string;
  const origin = 'http://localhost:8080';
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
    if (url.pathname !== '/intelligence_test')
      throw new Error('Tests require isolated intelligence_test database');
    app = await createApp();
    await app.init();
    db = app.get(PrismaService);
    const client = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .send({ email: 'client-a@demo.local', password: 'Demo123!' })
      .expect(201);
    clientCookie = client.headers['set-cookie'][0];
    const admin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', origin)
      .send({ email: 'admin@demo.local', password: 'Demo123!' })
      .expect(201);
    adminCookie = admin.headers['set-cookie'][0];
    csrf = (admin.body as { csrf: string }).csrf;
  });
  afterAll(async () => {
    await app?.close();
  });
  it('rejects anonymous access', async () => {
    await request(app.getHttpServer()).get('/analytics/summary').expect(401);
  });
  it('CLIENT cannot read another company through summary, timeseries or branch list', async () => {
    for (const path of [
      '/analytics/summary',
      '/analytics/timeseries',
      '/branches',
    ])
      await request(app.getHttpServer())
        .get(path + '?companyId=company-b')
        .set('Cookie', clientCookie)
        .expect(403);
    await request(app.getHttpServer())
      .get('/companies')
      .set('Cookie', clientCookie)
      .expect(403);
  });
  it('CLIENT cannot read foreign branch directly or through analytics', async () => {
    await request(app.getHttpServer())
      .get('/branches/branch-3')
      .set('Cookie', clientCookie)
      .expect(404);
    for (const path of ['summary', 'timeseries'])
      await request(app.getHttpServer())
        .get('/analytics/' + path + '?branchId=branch-3')
        .set('Cookie', clientCookie)
        .expect(404);
    const response = await request(app.getHttpServer())
      .get('/branches')
      .set('Cookie', clientCookie)
      .expect(200);
    expect(
      (response.body as { companyId: string }[]).every(
        (b) => b.companyId === 'company-a',
      ),
    ).toBe(true);
  });
  it('sync is idempotent and does not duplicate metrics', async () => {
    const body = { branchId: 'branch-1', from: '2026-01-01', to: '2026-01-03' };
    const sync = () =>
      request(app.getHttpServer())
        .post('/integrations/sync')
        .set('Origin', origin)
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', csrf)
        .send(body)
        .expect(201);
    await sync();
    const read = () =>
      db.dailyMetric.findMany({
        where: {
          branchId: 'branch-1',
          date: { gte: new Date('2026-01-01'), lte: new Date('2026-01-03') },
        },
        orderBy: { date: 'asc' },
      });
    const first = await read();
    await sync();
    expect(await read()).toEqual(first);
    expect(first).toHaveLength(3);
  });
  it('sums multiple branches, weights reviews correctly and fills missing days', async () => {
    const from = new Date('2025-01-01T00:00:00Z');
    await db.dailyMetric.createMany({
      data: [
        {
          id: 'test-m1',
          branchId: 'branch-1',
          date: from,
          views: 10,
          websiteClicks: 2,
          calls: 3,
          routes: 4,
        },
        {
          id: 'test-m2',
          branchId: 'branch-2',
          date: from,
          views: 30,
          websiteClicks: 4,
          calls: 5,
          routes: 6,
        },
      ],
    });
    await db.review.createMany({
      data: [
        {
          id: 'test-r1',
          branchId: 'branch-1',
          rating: 1,
          text: 'Test',
          createdAt: from,
        },
        {
          id: 'test-r2',
          branchId: 'branch-2',
          rating: 5,
          text: 'Test',
          createdAt: from,
        },
        {
          id: 'test-r3',
          branchId: 'branch-2',
          rating: 5,
          text: 'Test',
          createdAt: new Date('2025-01-01T23:59:59Z'),
        },
        {
          id: 'test-r4',
          branchId: 'branch-2',
          rating: 2,
          text: 'Outside period',
          createdAt: new Date('2025-01-03T00:00:00Z'),
        },
      ],
    });
    try {
      const response = await request(app.getHttpServer())
        .get('/analytics/summary?from=2025-01-01&to=2025-01-02')
        .set('Cookie', clientCookie)
        .expect(200);
      expect(response.body).toEqual({
        views: 40,
        websiteClicks: 6,
        calls: 8,
        routes: 10,
        averageRating: 11 / 3,
        reviewsCount: 3,
      });
      const series = await request(app.getHttpServer())
        .get('/analytics/timeseries?from=2025-01-01&to=2025-01-02')
        .set('Cookie', clientCookie)
        .expect(200);
      expect(series.body).toEqual([
        {
          date: '2025-01-01',
          views: 40,
          websiteClicks: 6,
          calls: 8,
          routes: 10,
        },
        { date: '2025-01-02', views: 0, websiteClicks: 0, calls: 0, routes: 0 },
      ]);
      const empty = await request(app.getHttpServer())
        .get('/analytics/summary?from=2024-01-01&to=2024-01-01')
        .set('Cookie', clientCookie)
        .expect(200);
      expect(empty.body).toMatchObject({
        averageRating: null,
        reviewsCount: 0,
        views: 0,
      });
    } finally {
      await db.dailyMetric.deleteMany({
        where: { id: { in: ['test-m1', 'test-m2'] } },
      });
      await db.review.deleteMany({ where: { id: { startsWith: 'test-r' } } });
    }
  });
  it('rejects CLIENT sync, invalid CSRF and foreign Origin', async () => {
    const body = { branchId: 'branch-1', from: '2026-01-01', to: '2026-01-03' };
    await request(app.getHttpServer())
      .post('/integrations/sync')
      .set('Origin', origin)
      .set('Cookie', adminCookie)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post('/integrations/sync')
      .set('Origin', 'https://evil.example')
      .set('Cookie', adminCookie)
      .set('X-CSRF-Token', csrf)
      .send(body)
      .expect(403);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', clientCookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/integrations/sync')
      .set('Origin', origin)
      .set('Cookie', clientCookie)
      .set('X-CSRF-Token', String(me.body.csrf))
      .send(body)
      .expect(403);
  });
  it('provider failure leaves database unchanged', async () => {
    const provider = app.get(MockGeoProvider);
    const before = await db.dailyMetric.count();
    const mock = jest
      .spyOn(provider, 'fetch')
      .mockRejectedValueOnce(new Error('Provider unavailable'));
    try {
      await request(app.getHttpServer())
        .post('/integrations/sync')
        .set('Origin', origin)
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', csrf)
        .send({ branchId: 'branch-1', from: '2026-01-01', to: '2026-01-03' })
        .expect(502);
      expect(await db.dailyMetric.count()).toBe(before);
    } finally {
      mock.mockRestore();
    }
  });
  it('rejects invalid dates and unknown input fields', async () => {
    await request(app.getHttpServer())
      .get('/analytics/summary?from=2026-02-30&to=2026-03-01')
      .set('Cookie', clientCookie)
      .expect(400);
    await request(app.getHttpServer())
      .get('/analytics/summary?userId=admin')
      .set('Cookie', clientCookie)
      .expect(400);
  });
  it('logout clears cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', origin)
      .set('Cookie', adminCookie)
      .set('X-CSRF-Token', csrf)
      .send({})
      .expect(201);
    expect(response.headers['set-cookie'][0]).toContain('session=;');
  });
});
