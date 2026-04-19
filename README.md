# Unified Commenting System (UCS)

A self-hosted, third-party embeddable comment system. Any website can add real-time, nested comments by dropping in a single `<script>` tag.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Host website                                               │
│  <div id="ucs-container"></div>                             │
│  <script src="cdn/embed.js"></script>  ← tiny IIFE snippet  │
│         │                                                   │
│         └── injects <iframe src="/widget?siteId=...">       │
└───────────────────────────┬─────────────────────────────────┘
                            │  REST + WebSocket
              ┌─────────────▼──────────────┐
              │   Node.js / Express API     │
              │   Socket.io  (WS server)    │
              └──────┬──────────┬──────────┘
                     │          │
              ┌──────▼───┐  ┌───▼──────────┐
              │PostgreSQL│  │  Redis        │
              │(data)    │  │  (Pub/Sub)    │
              └──────────┘  └──────────────┘
```

**Packages (pnpm monorepo):**

| Package | Description |
|---|---|
| `@ucs/backend` | Express API + Socket.io server |
| `@ucs/widget` | Preact iframe app + `embed.js` snippet |
| `@ucs/admin` | React dashboard for site owners |
| `@ucs/types` | Shared TypeScript interfaces |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- PostgreSQL ≥ 14
- Redis ≥ 7

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the backend

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/ucs` |
| `REDIS_URL` | `redis://localhost:6379` |
| `JWT_SECRET` | Any random string ≥ 32 chars |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/auth/google/callback` |
| `ALLOWED_ORIGINS` | Comma-separated: `http://localhost:3000,http://localhost:5173` |

### 3. Run database migrations

```bash
pnpm --filter @ucs/backend migrate
```

This applies all SQL files in `packages/backend/migrations/` in order and tracks them in `schema_migrations`.

### 4. Start everything

```bash
pnpm dev
```

| Service | URL |
|---|---|
| API | http://localhost:4000 |
| Widget (dev) | http://localhost:5174 |
| Admin dashboard | http://localhost:5173 |

---

## Embedding the widget on a host site

### Step 1 — Register your site

1. Open the admin dashboard at http://localhost:5173
2. Create an account, then go to **My Sites**
3. Register your site with its origin (e.g. `https://myblog.com`)
4. Copy the generated **Site ID**

### Step 2 — Add the snippet

Paste this into any page where you want comments:

```html
<div id="ucs-container"></div>

<script>
  window.UCSConfig = { siteId: "YOUR_SITE_ID" };
</script>
<script src="https://your-cdn.com/embed.js" async defer></script>
```

The snippet injects a sandboxed `<iframe>` that loads the Preact widget. The iframe is isolated from your page's CSS and JavaScript.

---

## API reference

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{ email, password, displayName }` | Create account |
| `POST` | `/auth/login` | `{ email, password }` | Get JWT |
| `GET` | `/auth/google` | — | Start Google OAuth flow |
| `GET` | `/auth/me` | — | Get current user (Bearer) |

### Threads

| Method | Path | Params | Description |
|---|---|---|---|
| `GET` | `/threads` | `?siteId=&url=` | Get-or-create thread |

### Comments

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/comments` | `?threadId=` | Fetch flat comment list |
| `POST` | `/comments` | `{ threadId, content, parentId? }` | Post comment (Bearer) |
| `DELETE` | `/comments/:id` | — | Soft-delete own comment (Bearer) |
| `POST` | `/comments/:id/vote` | `{ type: "up" \| "down" }` | Toggle vote (Bearer) |

### Sites

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/sites` | `{ name, allowedOrigin }` | Register site (Bearer) |
| `GET` | `/sites` | — | List own sites (Bearer) |

---

## WebSocket events (Socket.io)

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `join_thread` | `threadId: string` | Subscribe to live updates for a thread |
| `leave_thread` | `threadId: string` | Unsubscribe |

**Server → Client**

| Event | Payload | Description |
|---|---|---|
| `thread_update` | `{ event: "new_comment", data: Comment }` | New comment posted |
| `thread_update` | `{ event: "vote_update", data: { id, upvotes, downvotes } }` | Vote counts changed |

---

## Project structure

```
unified-commenting-system/
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json        # shared TS config
└── packages/
    ├── types/                # @ucs/types — shared interfaces
    ├── backend/              # @ucs/backend
    │   ├── migrations/       # 001_initial_schema.sql …
    │   ├── migrate.js        # migration runner (pnpm migrate)
    │   └── src/
    │       ├── index.ts      # entry point
    │       ├── app.ts        # Express app
    │       ├── config.ts     # env validation (Zod)
    │       ├── db/           # pg Pool
    │       ├── redis/        # ioredis pub + sub
    │       ├── socket/       # Socket.io ↔ Redis bridge
    │       ├── middleware/   # requireAuth, rateLimiter
    │       ├── services/     # auth, comment, vote business logic
    │       ├── routes/       # auth, comments, sites, threads
    │       └── utils/        # jwt, sanitize
    ├── widget/               # @ucs/widget (Preact + Vite)
    │   ├── public/embed.js   # host-site snippet
    │   └── src/
    │       ├── api.ts
    │       ├── store/        # auth + comments signals
    │       ├── hooks/        # useSocket
    │       └── components/   # App, AuthForm, CommentForm, CommentItem
    └── admin/                # @ucs/admin (React + Vite)
        └── src/
            ├── api.ts
            ├── context/      # AuthContext
            ├── components/   # Shell, RequireAuth
            └── pages/        # LoginPage, DashboardPage, SitesPage
```

---

## Security

- **XSS** — all comment content is stripped of HTML before saving (`sanitize-html`)
- **SQL injection** — all queries use parameterized `$1, $2, …` placeholders
- **CORS** — only registered `allowed_origin` values are accepted
- **Auth** — JWT (HS256) with configurable expiry; bcrypt (12 rounds) for passwords
- **Timing attacks** — login always runs bcrypt compare even on unknown email
- **Rate limiting** — 10 auth attempts / 15 min; 10 comments / min per IP
- **Duplicate votes** — enforced by `PRIMARY KEY(comment_id, user_id)` + DB transaction
- **Input validation** — Zod schemas on every endpoint before any business logic runs
