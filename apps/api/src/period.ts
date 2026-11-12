import { BadRequestException } from '@nestjs/common';
export const DAY = 86400000;
export function period(from?: string, to?: string) {
  const end = to
    ? new Date(to + 'T00:00:00Z')
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const start = from
    ? new Date(from + 'T00:00:00Z')
    : new Date(end.getTime() - 29 * DAY);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    (from && start.toISOString().slice(0, 10) !== from) ||
    (to && end.toISOString().slice(0, 10) !== to) ||
    start > end ||
    (end.getTime() - start.getTime()) / DAY > 365
  )
    throw new BadRequestException(
      'Период должен содержать от 1 до 366 дней с корректными датами',
    );
  return { start, end, exclusiveEnd: new Date(end.getTime() + DAY) };
}
