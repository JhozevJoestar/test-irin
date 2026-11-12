import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL ?? 'http://localhost:8080';
const page = await fetch(base + '/login');
assert.equal(page.status, 200);
const html = await page.text();
assert.ok(html.includes('Истинный интеллект'));
const asset = html.match(/src="([^"]+\.js)"/);
assert.ok(asset);
assert.equal((await fetch(base + asset[1])).status, 200);
assert.equal((await fetch(base + '/api/health')).status, 200);
for (const email of [
  'admin@demo.local',
  'client-a@demo.local',
  'client-b@demo.local',
]) {
  const response = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Demo123!' }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie?.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Lax'));
  const headers = { Cookie: cookie.split(';')[0] };
  const me = await fetch(base + '/api/auth/me', { headers });
  assert.equal(me.status, 200);
  const profile = await me.json();
  assert.equal(profile.email, email);
  const branches = await fetch(base + '/api/branches', { headers });
  assert.equal(branches.status, 200);
  const list = await branches.json();
  assert.equal(list.length, email.startsWith('admin') ? 4 : 2);
  const summary = await fetch(base + '/api/analytics/summary', { headers });
  assert.equal(summary.status, 200);
  const metrics = await summary.json();
  assert.ok(metrics.views > 0);
  assert.ok(metrics.reviewsCount > 0);
  const series = await fetch(base + '/api/analytics/timeseries', { headers });
  assert.equal(series.status, 200);
  assert.equal((await series.json()).length, 30);
  console.log(
    `${email}: login, me, ${list.length} branches, summary, timeseries OK`,
  );
}
console.log('Frontend, JavaScript asset, Nginx proxy and PostgreSQL health OK');
