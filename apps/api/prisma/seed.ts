import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { metricFor } from '../src/provider';
import { DAY } from '../src/period';
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seed запрещён в production');
  const passwordHash = await hash('Demo123!', 10);
  for (const [id, name] of [
    ['company-a', 'Северный Маяк'],
    ['company-b', 'Городская Линия'],
  ])
    await db.company.upsert({
      where: { id },
      create: { id, name },
      update: { name },
    });
  for (const [id, email, role, companyId] of [
    ['admin', 'admin@demo.local', 'ADMIN', null],
    ['client-a', 'client-a@demo.local', 'CLIENT', 'company-a'],
    ['client-b', 'client-b@demo.local', 'CLIENT', 'company-b'],
  ] as const)
    await db.user.upsert({
      where: { id },
      create: { id, email, role, companyId, passwordHash },
      update: { email, role, companyId, passwordHash },
    });
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  for (let i = 0; i < 4; i++) {
    const id = `branch-${i + 1}`;
    const companyId = i < 2 ? 'company-a' : 'company-b';
    await db.branch.upsert({
      where: { id },
      create: {
        id,
        companyId,
        name: ['Центральный', 'Набережная', 'Парк', 'Северный'][i],
        address: [
          'г. Примерск, ул. Маячная, 12',
          'г. Примерск, наб. Светлая, 8',
          'г. Образцово, ул. Парковая, 24',
          'г. Образцово, пр. Северный, 6',
        ][i],
      },
      update: {},
    });
    for (let d = 0; d < 90; d++) {
      const row = metricFor(id, new Date(today.getTime() - d * DAY));
      await db.dailyMetric.upsert({
        where: { branchId_date: { branchId: id, date: row.date } },
        create: { branchId: id, ...row },
        update: {},
      });
    }
    for (let r = 0; r < 12 + i * 3; r++) {
      const reviewId = `review-${i}-${r}`;
      await db.review.upsert({
        where: { id: reviewId },
        create: {
          id: reviewId,
          branchId: id,
          rating: 1 + ((r + i) % 5),
          text: [
            'Вежливые сотрудники, удобное расположение.',
            'Спасибо за внимательное обслуживание.',
            'Есть возможности улучшить время ожидания.',
          ][r % 3],
          createdAt: new Date(
            today.getTime() - ((r * 3) % 85) * DAY + 12 * 3600000,
          ),
        },
        update: {},
      });
    }
  }
  console.log('Demo seed: 2 компании, 4 филиала, 360 метрик, 3 пользователя');
}
seed()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
