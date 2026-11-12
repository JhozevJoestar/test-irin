# Истинный интеллект

Запускаемый MVP кабинета аналитики присутствия бизнеса в геосервисах. Интерфейс на русском языке, реальные REST-запросы и PostgreSQL. Все компании, адреса, отзывы и показатели — демонстрационные, внешние API и реальные ключи не используются.

## Быстрый запуск

Нужен Docker Desktop с Linux-контейнерами:

```sh
docker compose up --build -d
```

- Кабинет: http://localhost:8080
- API health: http://localhost:3000/health
- Swagger: http://localhost:3000/docs
- Через frontend API доступен с префиксом `/api`, например `/api/auth/me`.

Compose ждёт PostgreSQL по healthcheck, применяет Prisma-миграции, запускает идемпотентный demo seed и только после готовности API запускает Nginx. База сохраняется в именованном volume `postgres_data`. Порты привязаны к loopback. PostgreSQL с хоста доступен на localhost:55432 (POSTGRES_PORT), внутри сети Docker — postgres:5432. Остановка: `docker compose down` (данные сохраняются). Логи: `docker compose logs -f api`.

Параметры можно переопределить в `.env` по образцу `.env.example`. Значения по умолчанию предназначены только для локальной демонстрации. Если меняете WEB_PORT, измените и WEB_ORIGIN. Не публикуйте демонстрационные учётные записи в production.

## Тестовые пользователи

| Роль   | Email               | Пароль   | Доступ          |
| ------ | ------------------- | -------- | --------------- |
| ADMIN  | admin@demo.local    | Demo123! | Все компании    |
| CLIENT | client-a@demo.local | Demo123! | Северный Маяк   |
| CLIENT | client-b@demo.local | Demo123! | Городская Линия |

Две компании, четыре филиала, 90 дней метрик для каждого филиала и 66 отзывов. Seed использует стабильные ID и детерминированную функцию от филиала и календарной даты; диапазон отсчитывается от текущего дня UTC. Повторный seed не перезаписывает метрики и отзывы, но восстанавливает демонстрационные пароли пользователей. В production seed явно запрещён.

## Запуск автоматизированных тестов

Тесты находятся в [apps/api/test/app.spec.ts](apps/api/test/app.spec.ts). Используются Jest и Supertest: проверки выполняют HTTP-запросы к backend с настоящей PostgreSQL.

1. Запустите Docker Desktop и дождитесь готовности Docker Engine.
2. Откройте терминал в корне проекта, где находится `docker-compose.yml`.
3. Запустите тесты:

```sh
docker compose --profile test up --build --abort-on-container-exit --exit-code-from tests tests
```

Docker автоматически создаст отдельную тестовую базу `intelligence_test`, применит миграции, добавит демонстрационные данные и запустит тесты. Устанавливать Node.js и выполнять `npm install` на компьютере не требуется. Основная база приложения не затрагивается.

В файле реализовано 9 тестов. В частности, изоляцию компаний проверяют:

- `CLIENT cannot read another company through summary, timeseries or branch list` — клиент компании A запрашивает данные компании B через API и получает `403`.
- `CLIENT cannot read foreign branch directly or through analytics` — запрос чужого филиала напрямую и через аналитику возвращает `404`; список филиалов содержит только свою компанию.

Также проверяются повторная синхронизация без дублей, агрегация статистики, обработка ошибки провайдера, авторизация, CSRF, валидация и выход из аккаунта.

При успешном выполнении в терминале появится:

```text
PASS test/app.spec.ts
Tests: 9 passed, 9 total
```

После проверки удалите тестовые контейнеры:

```sh
docker compose --profile test rm -sf tests postgres-test
```

Для повторного чистого прогона выполните команду запуска тестов ещё раз. При ошибке команда завершится с ненулевым кодом, а Jest покажет название проваленного теста и причину.

## Стек и архитектура

npm workspaces, строгий TypeScript, NestJS 12, Prisma 6, PostgreSQL 16, React 18, Vite 6, React Router, TanStack Query, Tailwind CSS, Recharts, React Hook Form + Zod. UI использует доступные нативные select/input/button с label, focus, disabled, error и loading состояниями; иконки Lucide. Backend: bcrypt, JWT, class-validator, Helmet, Swagger. Проверки: ESLint, Prettier, Jest + Supertest.

```text
apps/api/src/
  auth.*                 вход, cookie, сессия, CSRF guard
  analytics.service.ts   tenant scope, выборки и SQL-агрегации Prisma
  data.controller.ts     маршруты данных без бизнес-логики
  integrations.service.ts транзакционный upsert
  provider.ts            детерминированный адаптер геосервиса
  dto.ts, period.ts      валидация запросов и периода
  bootstrap.ts           CORS, Origin, ошибки, Swagger
apps/api/prisma/         схема, SQL-миграция, seed
apps/api/test/           integration/e2e на отдельной PostgreSQL
apps/web/src/            страницы, компоненты, REST-клиент, стили
```

Nest DI управляет сервисами; контроллеры передают DTO сервисам. PrismaService отвечает за соединение. Prisma-запросы сосредоточены в сервисах без дополнительного repository wrapper: для MVP он дублировал бы интерфейс ORM. UI переиспользует layout, состояния загрузки/ошибок, карточки и dashboard для филиала и сводки.

## Модель данных

- Company → Users и Branches (1:N).
- User: уникальный email, bcrypt-хеш, ADMIN/CLIENT, nullable companyId; SQL CHECK требует компанию для CLIENT.
- Branch → DailyMetric и Review (1:N).
- DailyMetric: DATE, четыре неотрицательных Int, уникальный `(branchId,date)`. Этот B-tree одновременно обслуживает выборку филиала по диапазону. Отдельный индекс date полезен для общих диапазонов.
- Review: рейтинг 1–5, текст, статус PUBLISHED/PENDING/HIDDEN и timestamp. Индекс `(branchId,createdAt)`.

FK сохраняют целостность: удаление компании при наличии пользователей/филиалов запрещено; удаление филиала каскадно удаляет метрики/отзывы. Дополнительные CHECK находятся в SQL-миграции (Prisma schema не выражает их декларативно).

## Авторизация и изоляция

JWT подписан серверным секретом, действует 8 часов, хранится только в HttpOnly SameSite=Lax cookie. В production cookie всегда Secure. `/auth/me` возвращает актуального пользователя из БД; ID пользователя берётся из проверенного JWT, роль и компания повторно читаются сервером. Пароли хешируются bcrypt с cost 10. Ответы не содержат passwordHash.

CLIENT scope всегда строится из серверной сессии. Чужой companyId отклоняется с 403; чужой branchId — с 404. `/companies` разрешён только ADMIN. Одинаковая проверка применяется к спискам, прямому URL филиала, summary и timeseries. Навигация UI не является границей безопасности.

Все изменяющие запросы, включая login, требуют точного Origin из WEB_ORIGIN. Авторизованные POST дополнительно требуют `X-CSRF-Token`, связанный с подписанной сессией и полученный через `/auth/me` или login. Для curl/Supertest нужно явно передать Origin. CORS разрешает credentials только для WEB_ORIGIN. Logout очищает cookie с теми же атрибутами. JWT остаётся действительным до истечения срока, если его скопировали до logout; централизованный отзыв сессий — дальнейшее развитие.

Логин ограничен 10 попытками за 15 минут на IP, хранилище в памяти процесса, просроченные записи удаляются при запросах. За Nginx в MVP API видит IP прокси: лимит общий для пользователей через этот прокси. Для production нужен доверенный proxy chain и Redis rate limiter, а не безусловное доверие X-Forwarded-For.

## Аналитика и даты

DailyMetric.date — календарная дата UTC без времени. from/to включительны, по умолчанию последние 30 дней включая текущий день UTC. Максимум 366 дней. Для отзывов используется полуоткрытый интервал `[from 00:00 UTC, to+1 день 00:00 UTC)`. Некорректные даты и обратные интервалы отклоняются. График заполняет отсутствующие дни нулями.

views/websiteClicks/calls/routes — SUM по разрешённым филиалам. Рейтинг — AVG опубликованных записей Review внутри периода, число отзывов — COUNT этих же записей. Средние значения филиалов не усредняются. При отсутствии отзывов: null/0. Агрегации выполняются PostgreSQL через Prisma aggregate/groupBy; summary читает суммы и отзывы в транзакции. Фильтры компании, филиала и периода применяются одновременно. Фильтры UI синхронизированы с query params.

## REST API

| Метод | Путь                  | Назначение                     |
| ----- | --------------------- | ------------------------------ |
| POST  | /auth/login           | email, password; cookie + csrf |
| POST  | /auth/logout          | очищение cookie                |
| GET   | /auth/me              | профиль и csrf                 |
| GET   | /companies            | компании, ADMIN                |
| GET   | /branches?companyId=  | доступные филиалы              |
| GET   | /branches/:id         | конкретный филиал              |
| GET   | /analytics/summary    | суммарные KPI                  |
| GET   | /analytics/timeseries | ежедневные показатели          |
| POST  | /integrations/sync    | ADMIN: branchId, from, to      |
| GET   | /health               | готовность БД                  |

Обе analytics ручки принимают companyId, branchId, from, to (YYYY-MM-DD). DTO отклоняют неизвестные поля. Ошибки имеют `{statusCode,message,timestamp}` (включая ранний отказ проверки Origin), неожиданные ошибки не раскрывают внутренности. Swagger показывает маршруты; подробные поля и правила запросов описаны здесь и в DTO.

## Локальная разработка

Node.js 22, npm 10, PostgreSQL 16:

```sh
npm ci
docker compose up -d postgres
```

Создайте `.env` из `.env.example` и экспортируйте DATABASE_URL, JWT_SECRET, WEB_ORIGIN в окружение терминала. Node/Prisma команды используют окружение процесса; frontend dev по умолчанию http://localhost:5173, поэтому для dev API укажите `WEB_ORIGIN=http://localhost:5173`.

```sh
npm run generate -w apps/api
npm run migrate -w apps/api
npm run seed -w apps/api
npm run dev -w apps/api
# В другом терминале:
npm run dev -w apps/web
```

Vite проксирует `/api` на localhost:3000. В Docker это делает Nginx. Новую миграцию при разработке: `npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name change_name`. На запуске применяется только `migrate deploy`.

## Проверки

```sh
npm run lint
npm run typecheck
npm run build
npx prettier --check .
docker compose --profile test up --build --abort-on-container-exit --exit-code-from tests tests
```

Тестовый сервис запускает отдельный PostgreSQL `intelligence_test` в tmpfs, применяет миграции и seed, запускает Jest/Supertest. Тесты отказываются работать с другим именем БД. Development volume не используется. Перед повторным полным прогоном очистите только тестовые сервисы: `docker compose --profile test rm -sf tests postgres-test`. Или с доступной тестовой PostgreSQL экспортируйте DATABASE_URL с базой intelligence_test и запустите миграции, seed, `npm test`.

Покрыты: 401 без сессии, company scoping, 404 чужих филиалов, изоляция списка, idempotent sync, SUM нескольких филиалов, взвешенный рейтинг, границы дат отзывов, нулевые дни, null rating, CSRF/Origin/роль, ошибка провайдера без изменений БД, validation, logout.

## Mock-интеграция

MockGeoProvider имитирует внешнюю систему внутри процесса без случайности: значения зависят от branchId и даты. Сервис сначала проверяет ADMIN и существование филиала, затем получает и полностью валидирует ответ (типы, границы Int, даты, полнота, отсутствие дублей). Все UPSERT по `(branchId,date)` выполняются одной транзакцией. Любая ошибка провайдера/валидации/БД возвращает 502 и не сохраняет частичное состояние. UI требует выбрать филиал, показывает pending/success/error и инвалидирует summary/timeseries через TanStack Query.

## Компромиссы и ограничения MVP

Нет CRUD компаний/пользователей, регистрации, восстановления пароля, редактирования отзывов и реальной интеграции: они не входят в задание. Seed заполняет демо-данные. Синхронизация синхронная и ограничена 366 днями. Списки небольшие, без пагинации. Статистика обновляется по запросу; нет live stream. Summary и timeseries — независимые REST-запросы, при конкурентном обновлении между ними возможен краткий рассинхрон. В памяти хранятся лимиты логина, нет Redis и централизованного revoke JWT. Продакшен требует HTTPS, собственного секрета JWT, отключения DEMO_SEED, удаления demo пользователей, NODE_ENV=production и WEB_ORIGIN с HTTPS. Значения Compose — исключительно для локального запуска.

Выбранный monorepo позволяет собрать весь продукт одной командой и проверить безопасность настоящими HTTP-запросами к PostgreSQL. Tenant scope, ограничения БД и транзакции закрывают основные риски без очередей и лишних инфраструктурных слоёв.

## Рост до 500+ компаний и тысяч филиалов

1. Сохранить обязательный серверный tenant-scoping с companyId. Добавить PostgreSQL RLS как второй барьер с transaction-local tenant context; тщательно проверить pooling и отдельные права ADMIN.
2. Ввести cursor pagination филиалов и отзывов, лимиты ответов, составные индексы по фактическим запросам. Контролировать SQL через EXPLAIN ANALYZE на репрезентативных данных, статистику pg_stat_statements и slow query log.
3. Redis для rate limiting и аналитического кеша. Ключ включает tenant, branch, период и версию данных; invalidation после commit синхронизации.
4. Перенести sync в очередь (например BullMQ), возвращать jobId/202. Workers выполняют ограниченные пакеты с retry, exponential backoff, idempotency и dead-letter queue. Нужны distributed lock на branch/period и наблюдение за заданиями.
5. При росте истории — партиционирование по дате, materialized views или дневные предварительные агрегаты. Рейтинг хранить как sum/count, чтобы сохранить корректное взвешивание.
6. Структурированные логи с requestId/tenantId без секретов, метрики latency/error rate/pool/queue, tracing, алерты, backups и проверка восстановления.
7. Stateless API горизонтально за балансировщиком; общий Redis для лимитов/сессий, пул соединений PgBouncer с учётом Prisma и RLS.
8. CI/CD: npm ci → generate → lint/typecheck → изолированные integration tests → build контейнеров → security scan → staging → migrate deploy → rollout с health/readiness и откатом приложения. Миграции обратно совместимые, выполняются отдельным job.

Сейчас эти технологии намеренно не развёрнуты: сначала следует измерить реальные узкие места.
