import { Injectable } from '@nestjs/common';
import { DAY } from './period';
export function metricFor(branchId: string, date: Date) {
  let hash = 0;
  for (const c of branchId + date.toISOString().slice(0, 10))
    hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return {
    date,
    views: 180 + (hash % 620),
    websiteClicks: 15 + (hash % 80),
    calls: 8 + (hash % 35),
    routes: 12 + (hash % 50),
  };
}
@Injectable()
export class MockGeoProvider {
  async fetch(branchId: string, start: Date, end: Date) {
    return Array.from(
      { length: Math.floor((end.getTime() - start.getTime()) / DAY) + 1 },
      (_, i) => metricFor(branchId, new Date(start.getTime() + i * DAY)),
    );
  }
}
