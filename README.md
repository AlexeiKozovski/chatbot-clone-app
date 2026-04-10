## Chatbot clone (ChatGPT-like)

Demo project matching the technical task:

- **Client**: Next.js (React) + Tailwind + Shadcn UI + TanStack Query
- **API**: Next.js REST routes (`src/app/api/**`)
- **DB**: Postgres (Supabase) via **service role key** (server-only; no DB calls from components)
- **Auth**: Custom email/password + httpOnly session cookie (stored in Postgres)
- **Streaming**: Server-Sent Events (SSE) for assistant responses
- **Anonymous mode**: 3 free questions (tracked per session)
- **Uploads**: image attachments and document uploads (used as context)
- **Sync**: cross-tab sync (BroadcastChannel) + Supabase Realtime for signed-in users

### Project structure

- `src/components/**`: UI components
- `src/client/**`: client-side fetch helpers (API-only)
- `src/server/**`: server-only logic (DB, auth, LLM)
- `src/app/api/**`: REST API endpoints
- `supabase/schema.sql`: DB schema to run in Supabase SQL editor

### Setup (Supabase)

1. Create a Supabase project (Postgres).

2. In Supabase SQL editor, run:

```sql
-- paste contents of supabase/schema.sql
```

3. Get credentials:

- `SUPABASE_URL`: Project settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Project settings → API → service_role key (**server-only**)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional, for Realtime in browser): Project settings → API → anon/publishable key

### Setup (Environment)

Copy `.env.example` to `.env.local` and fill:

```bash
cp .env.example .env.local
```

- **Required**
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SESSION_JWT_SECRET` (>= 32 chars)

- **Optional (real LLM responses)**
    - `LLM_BASE_URL` (OpenAI-compatible endpoint, e.g. OpenAI/OpenRouter)
    - `LLM_API_KEY`
    - `LLM_MODEL` (defaults to `openrouter/free`)

- **Optional (Realtime on client)**
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### API overview (REST)

- `POST /api/auth/register` { email, password }
- `POST /api/auth/login` { email, password }
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/chats`
- `POST /api/chats` { title }
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages` { content }
- `POST /api/chats/:chatId/stream` (SSE stream of assistant response)
- `POST /api/chats/:chatId/documents` (multipart `file`)
- `POST /api/messages/:messageId/attachments` (multipart `file`)
- `PATCH /api/messages/:messageId` { content }

### Current chat behavior

- Assistant response is generated via SSE, but UI renders **final saved response only** (no token-by-token preview).
- Image upload appends signed URL marker into the user message.
- Uploaded documents are parsed (`pdf/docx/txt/md`) and last documents are added to LLM system context.

### Notes

- Client code fetches data from API routes only.
- DB access is server-only via Supabase service key.
- Public Supabase key is used only for Realtime subscriptions in browser.

### Deployment

Deploy to Vercel. Add the same environment variables in Vercel project settings.
