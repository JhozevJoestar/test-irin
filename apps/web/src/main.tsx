import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  LayoutDashboard,
  MapPin,
  Building2,
  LogOut,
  ArrowUpRight,
  Eye,
  MousePointer2,
  Phone,
  Navigation,
  Star,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { api, setCsrf, User, Company, Branch, Summary, Point } from './api';
import '@fontsource-variable/manrope';
import './styles.css';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const number = new Intl.NumberFormat('ru-RU');
const dateLabel = (value: string) =>
  new Date(value + 'T00:00:00Z').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
function Status({ error, empty }: { error?: Error | null; empty?: boolean }) {
  return (
    <div className="status" role={error ? 'alert' : 'status'}>
      {error ? (
        <>
          <strong>Не удалось загрузить данные</strong>
          <p>{error.message}</p>
          <button onClick={() => void queryClient.invalidateQueries()}>
            Попробовать снова
          </button>
        </>
      ) : empty ? (
        <>
          <MapPin size={28} />
          <strong>Пока нет данных</strong>
          <p>Выберите другой период или синхронизируйте филиал.</p>
        </>
      ) : (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      )}
    </div>
  );
}
const loginSchema = z.object({
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});
function Login() {
  const qc = useQueryClient();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useMutation({
    mutationFn: (data: z.infer<typeof loginSchema>) =>
      api<{ csrf: string }>('/auth/login', data),
    onSuccess: async (data) => {
      setCsrf(data.csrf);
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/auth/me'),
    retry: false,
  });
  if (me.data) return <Navigate to="/dashboard" replace />;
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">АНАЛИТИКА ГЕОСЕРВИСОВ</span>
          <h1>
            Весь ваш бизнес.
            <br />В одной картине.
          </h1>
          <p>
            Следите за тем, как клиенты находят ваши филиалы, и принимайте
            решения на основе данных.
          </p>
          <div className="story-line" />
          <span className="story-note">
            <ShieldCheck size={18} /> Данные каждой компании надёжно изолированы
          </span>
        </div>
        <small>Истинный интеллект · Аналитический кабинет</small>
      </div>
      <main className="login-main">
        <form
          onSubmit={form.handleSubmit((data) => login.mutate(data))}
          className="login-card"
        >
          <span className="badge">Добро пожаловать</span>
          <h2>Вход в кабинет</h2>
          <p className="muted">Введите данные вашего аккаунта</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              placeholder="you@company.ru"
              {...form.register('email')}
            />
          </label>
          {form.formState.errors.email && (
            <small className="error">
              {form.formState.errors.email.message}
            </small>
          )}
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Введите пароль"
              {...form.register('password')}
            />
          </label>
          {form.formState.errors.password && (
            <small className="error">
              {form.formState.errors.password.message}
            </small>
          )}
          {login.error && (
            <p role="alert" className="error">
              {login.error.message}
            </p>
          )}
          <button className="primary" disabled={login.isPending}>
            {login.isPending ? 'Входим…' : 'Войти в кабинет'}
            <ArrowUpRight size={18} />
          </button>
          <div className="demo-note">
            Демонстрационный доступ
            <br />
            <b>admin@demo.local</b> / <b>Demo123!</b>
            <br />
            Клиенты: client-a@demo.local, client-b@demo.local
          </div>
        </form>
      </main>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Activity size={23} />
      </span>
      <span>
        Истинный
        <br />
        <b>интеллект</b>
      </span>
    </div>
  );
}
function Shell() {
  const [menu, setMenu] = useState(false);
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await api<User>('/auth/me');
      setCsrf(user.csrf);
      return user;
    },
    retry: false,
  });
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', {}),
    onSuccess: () => {
      setCsrf('');
      qc.clear();
      window.location.assign('/login');
    },
  });
  if (me.isPending) return <Status />;
  if (!me.data) return <Navigate to="/login" replace />;
  const user = me.data;
  return (
    <div className="app">
      <aside className={menu ? 'sidebar open' : 'sidebar'}>
        <Brand />
        <span className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</span>
        <nav onClick={() => setMenu(false)}>
          <NavLink to="/dashboard">
            <LayoutDashboard size={19} />
            Обзор аналитики
          </NavLink>
          <NavLink to="/branches">
            <MapPin size={19} />
            Филиалы
          </NavLink>
          {user.role === 'ADMIN' && (
            <NavLink to="/companies">
              <Building2 size={19} />
              Компании
            </NavLink>
          )}
        </nav>
        <div className="sidebar-foot">
          <span className="live-dot" /> Данные из PostgreSQL
          <p>
            Единый центр аналитики
            <br />
            вашего бизнеса
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Открыть меню"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Рабочее пространство <ChevronRight size={14} /> <b>Аналитика</b>
          </span>
          <div className="user">
            <span className="avatar">{user.role === 'ADMIN' ? 'А' : 'К'}</span>
            <div>
              <b>{user.role === 'ADMIN' ? 'Администратор' : 'Клиент'}</b>
              <small>{user.email}</small>
            </div>
            <button
              className="icon-button"
              title="Выйти"
              aria-label="Выйти"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {logout.error && (
          <p role="alert" className="error">
            {logout.error.message}
          </p>
        )}
        <main className="content">
          <Routes>
            <Route path="dashboard" element={<Dashboard user={user} />} />
            <Route path="branches" element={<Branches />} />
            <Route path="branches/:id" element={<Dashboard user={user} />} />
            <Route
              path="companies"
              element={
                user.role === 'ADMIN' ? (
                  <Companies />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <footer>
            Истинный интеллект{' '}
            <span>Аналитика присутствия бизнеса в геосервисах</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Dashboard({ user }: { user: User }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const requestedPeriod = params.get('period') ?? '30';
  const days = ['7', '30', '90', 'custom'].includes(requestedPeriod)
    ? requestedPeriod
    : '30';
  const requestedTo = params.get('to');
  const to =
    requestedTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedTo) &&
    Number.isFinite(new Date(requestedTo + 'T00:00:00Z').getTime())
      ? requestedTo
      : today;
  const from =
    params.get('from') ??
    new Date(
      new Date(to + 'T00:00:00Z').getTime() -
        (Number(days) || 30) * 86400000 +
        86400000,
    )
      .toISOString()
      .slice(0, 10);
  const companyId = params.get('companyId') ?? '';
  const branchId = id ?? params.get('branchId') ?? '';
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'companyId') next.delete('branchId');
    setParams(next);
  };
  const companyQuery = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<Company[]>('/companies'),
    enabled: user.role === 'ADMIN',
  });
  const branches = useQuery({
    queryKey: ['branches', companyId],
    queryFn: () =>
      api<Branch[]>(
        '/branches' +
          (companyId ? '?companyId=' + encodeURIComponent(companyId) : ''),
      ),
  });
  const branch = useQuery({
    queryKey: ['branch', id],
    queryFn: () => api<Branch>('/branches/' + encodeURIComponent(id!)),
    enabled: !!id,
  });
  const filter = new URLSearchParams({ from, to });
  if (companyId) filter.set('companyId', companyId);
  if (branchId) filter.set('branchId', branchId);
  const suffix = '?' + filter.toString();
  const summary = useQuery({
    queryKey: ['summary', suffix],
    queryFn: () => api<Summary>('/analytics/summary' + suffix),
  });
  const series = useQuery({
    queryKey: ['timeseries', suffix],
    queryFn: () => api<Point[]>('/analytics/timeseries' + suffix),
  });
  const sync = useMutation({
    mutationFn: () =>
      api<{ processed: number; message: string }>('/integrations/sync', {
        branchId,
        from,
        to,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['summary'] }),
        qc.invalidateQueries({ queryKey: ['timeseries'] }),
      ]);
    },
  });
  const cards = [
    { key: 'views', label: 'Просмотры карточек', icon: Eye, color: 'blue' },
    {
      key: 'websiteClicks',
      label: 'Переходы на сайт',
      icon: MousePointer2,
      color: 'violet',
    },
    { key: 'calls', label: 'Звонки', icon: Phone, color: 'green' },
    {
      key: 'routes',
      label: 'Построения маршрутов',
      icon: Navigation,
      color: 'orange',
    },
    {
      key: 'averageRating',
      label: 'Средний рейтинг',
      icon: Star,
      color: 'yellow',
    },
    {
      key: 'reviewsCount',
      label: 'Отзывы',
      icon: MessageSquare,
      color: 'cyan',
    },
  ] as const;
  const filterError = branches.error ?? companyQuery.error ?? branch.error;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ВАШ БИЗНЕС В ЦИФРАХ</span>
          <h1>
            {id
              ? (branch.data?.name ?? 'Аналитика филиала')
              : 'Обзор аналитики'}
          </h1>
          <p>
            {id
              ? branch.data?.address
              : 'Ключевые показатели присутствия в геосервисах'}
          </p>
        </div>
        <span className="badge">
          <span className="live-dot" /> Актуальные данные
        </span>
      </div>
      {id && (
        <Link className="back-link" to="/branches">
          ← Все филиалы
        </Link>
      )}
      <section className="filters" aria-label="Фильтры аналитики">
        {user.role === 'ADMIN' && !id && (
          <label>
            Компания
            <select
              value={companyId}
              onChange={(e) => update('companyId', e.target.value)}
            >
              <option value="">Все компании</option>
              {companyQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!id && (
          <label>
            Филиал
            <select
              value={branchId}
              onChange={(e) => update('branchId', e.target.value)}
            >
              <option value="">Все филиалы</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.company.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Период
          <select
            value={days}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('period', e.target.value);
              next.delete('from');
              next.delete('to');
              setParams(next);
            }}
          >
            <option value="7">Последние 7 дней</option>
            <option value="30">Последние 30 дней</option>
            <option value="90">Последние 90 дней</option>
            <option value="custom">Свой диапазон</option>
          </select>
        </label>
        {days === 'custom' && (
          <>
            <label>
              С
              <input
                aria-label="Начало периода"
                type="date"
                value={from}
                onChange={(e) => update('from', e.target.value)}
              />
            </label>
            <label>
              По
              <input
                aria-label="Конец периода"
                type="date"
                value={to}
                onChange={(e) => update('to', e.target.value)}
              />
            </label>
          </>
        )}
        <span className="period-caption">
          {dateLabel(from)} — {dateLabel(to)}
        </span>
      </section>
      {filterError && <Status error={filterError} />}
      <div className="section-label">
        <h2>Ключевые показатели</h2>
        <span>За выбранный период · UTC</span>
      </div>
      {summary.isPending ? (
        <Status />
      ) : summary.error ? (
        <Status error={summary.error} />
      ) : (
        summary.data && (
          <section className="kpi-grid">
            {cards.map(({ key, label, icon: Icon, color }) => (
              <article className="kpi" key={key}>
                <div className="kpi-top">
                  <span>{label}</span>
                  <span className={'metric-icon ' + color}>
                    <Icon size={18} />
                  </span>
                </div>
                <strong>
                  {summary.data[key] === null
                    ? '—'
                    : key === 'averageRating'
                      ? summary.data[key]?.toLocaleString('ru-RU', {
                          maximumFractionDigits: 2,
                        })
                      : number.format(summary.data[key] ?? 0)}
                  {key === 'averageRating' && <small> / 5</small>}
                </strong>
                <span className="kpi-note">
                  {key === 'averageRating'
                    ? 'На основе опубликованных отзывов'
                    : key === 'reviewsCount'
                      ? 'Опубликовано за период'
                      : 'Суммарно по выбранным филиалам'}
                </span>
              </article>
            ))}
          </section>
        )
      )}
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Динамика просмотров</h2>
            <p>Как часто клиенты открывают карточки ваших филиалов</p>
          </div>
          <span className="chart-legend">
            <i /> Просмотры
          </span>
        </div>
        {series.isPending ? (
          <Status />
        ) : series.error ? (
          <Status error={series.error} />
        ) : series.data?.every((p) => p.views === 0) ? (
          <Status empty />
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series.data}
                margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e8edf4"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={dateLabel}
                  minTickGap={42}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8691a3', fontSize: 12 }}
                  dy={12}
                />
                <YAxis
                  tickFormatter={(v) => number.format(Number(v))}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8691a3', fontSize: 12 }}
                  width={55}
                />
                <Tooltip
                  labelFormatter={(v) => dateLabel(String(v))}
                  formatter={(v) => [number.format(Number(v)), 'Просмотры']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#views)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Филиалы в поле зрения</h2>
              <p>Перейдите к подробной аналитике</p>
            </div>
            <MapPin size={20} />
          </div>
          {branches.data
            ?.filter((b) => !id || b.id === id)
            .map((b) => (
              <Link className="branch-row" key={b.id} to={'/branches/' + b.id}>
                <span className="location-icon">
                  <MapPin size={18} />
                </span>
                <span>
                  <b>{b.name}</b>
                  <small>
                    {b.company.name} · {b.address}
                  </small>
                </span>
                <ChevronRight size={17} />
              </Link>
            ))}
          {branches.data?.length === 0 && <Status empty />}
        </section>
        <section className="panel insight">
          <span className="metric-icon blue">
            <Activity size={21} />
          </span>
          <h2>
            {user.role === 'ADMIN'
              ? 'Управление данными'
              : 'Единая картина бизнеса'}
          </h2>
          <p>
            {user.role === 'ADMIN'
              ? 'Обновите статистику выбранного филиала из демонстрационного геосервиса. Повторная синхронизация не создаёт дубли.'
              : 'Все показатели собраны из ежедневной статистики филиалов. Используйте фильтры, чтобы увидеть нужный срез.'}
          </p>
          {user.role === 'ADMIN' && (
            <>
              <button
                className="primary"
                disabled={!branchId || sync.isPending || summary.isError}
                onClick={() => sync.mutate()}
              >
                <RefreshCw size={16} className={sync.isPending ? 'spin' : ''} />
                {sync.isPending ? 'Синхронизация…' : 'Синхронизировать'}
              </button>
              {!branchId && (
                <small>Для синхронизации выберите один филиал</small>
              )}
              {sync.data && (
                <p role="status" className="success">
                  Обновлено дней: {sync.data.processed}
                </p>
              )}
              {sync.error && (
                <p role="alert" className="error">
                  {sync.error.message}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
function Branches() {
  const result = useQuery({
    queryKey: ['branches', ''],
    queryFn: () => api<Branch[]>('/branches'),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ГЕОГРАФИЯ ВАШЕГО БИЗНЕСА</span>
          <h1>Филиалы</h1>
          <p>Все доступные вам точки присутствия</p>
        </div>
        <span className="badge">{result.data?.length ?? '—'} филиала</span>
      </div>
      {result.isPending ? (
        <Status />
      ) : result.error ? (
        <Status error={result.error} />
      ) : !result.data.length ? (
        <Status empty />
      ) : (
        <section className="branch-grid">
          {result.data.map((b) => (
            <Link
              to={'/branches/' + b.id}
              className="panel branch-card"
              key={b.id}
            >
              <div className="branch-card-top">
                <span className="location-icon">
                  <MapPin size={24} />
                </span>
                <ArrowUpRight size={19} />
              </div>
              <span className="eyebrow">{b.company.name}</span>
              <h2>{b.name}</h2>
              <p>{b.address}</p>
              <span className="card-link">
                Открыть аналитику <ChevronRight size={16} />
              </span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
function Companies() {
  const result = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<Company[]>('/companies'),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">УПРАВЛЕНИЕ КОМПАНИЯМИ</span>
          <h1>Компании</h1>
          <p>Обзор организаций в вашем рабочем пространстве</p>
        </div>
        <span className="badge">Только для администратора</span>
      </div>
      {result.isPending ? (
        <Status />
      ) : result.error ? (
        <Status error={result.error} />
      ) : !result.data.length ? (
        <Status empty />
      ) : (
        <section className="panel">
          {result.data.map((c) => (
            <Link
              className="branch-row"
              to={'/dashboard?companyId=' + c.id}
              key={c.id}
            >
              <span className="location-icon">
                <Building2 size={22} />
              </span>
              <span>
                <b>{c.name}</b>
                <small>Филиалов: {c._count.branches}</small>
              </span>
              <span className="card-link">
                Аналитика <ChevronRight size={16} />
              </span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Shell />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
