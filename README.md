# Sitewatch — M0 + M1 + M2

One task inbox, four views (Today / Overdue / All open / Done), manual add, one-tap complete with **photo proof**, and **recurring checks that generate themselves**. Magic-link sign-in. Mobile-first PWA.

**M2 (recurring engine) is now included.** The "Recurring" screen lets you define statutory checks once (legionella, flushes, walk-arounds) with a frequency; the `generate_due_tasks()` function then materialises them as due tasks on schedule, so a skipped one still reappears. A "Generate due tasks now" button runs it instantly for testing; in production a daily Vercel Cron does it automatically.

## 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a project. Then in **SQL Editor**, paste and run the whole of `supabase/migrations/0001_init.sql`. That builds every table, the row-level-security policies, the signup trigger, and the `task-proofs` storage bucket for photo proof — all in one run.

In **Authentication → Providers → Email**, make sure Email is enabled (magic links are on by default).

## 2. Add your keys

```bash
cp .env.local.example .env.local
```

Fill in from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Enter your email, click the link it sends, name your site, and start adding tasks.

> Local magic links: if the email link points at the wrong host, set **Authentication → URL Configuration → Site URL** to `http://localhost:3000` in Supabase while developing.

## What's here

```
src/app/login          magic-link sign-in
src/app/auth/callback  exchanges the link for a session
src/app/tasks          the inbox (server component) + views
src/app/tasks/actions  server actions: add / start / complete (+ photo) / reopen
src/app/recurring      template manager: presets, custom, "Run now"
src/app/api/cron       daily generator endpoint (Vercel Cron hits this)
supabase/migrations    full schema, RLS, trigger, storage bucket, M1/M2 functions
```

## Next milestones

- **M1 — proof. ✅ Included.** Capture a photo on completion, upload to the `task-proofs` bucket, and complete through the `complete_task` RPC so a flagged task can't be closed without a timestamped photo. Tick "Require a photo" when adding a task to turn it on.
- **M2 — recurring. ✅ Included.** The `/recurring` screen creates templates (one-tap presets or custom). `generate_due_tasks()` materialises due tasks — "Run now" for instant testing, or daily via Vercel Cron / pg_cron. A skipped check still reappears the next cycle.
- **M3 — intake + export.** Public `/report` form for staff, a daily digest email, and the date-range "inspection-ready" export.

## Deploy

Push to GitHub, import into Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Update the Supabase **Site URL** and **Redirect URLs** to your Vercel domain.

### Daily recurring generator

`vercel.json` already schedules `/api/cron/generate` for 06:00 daily. To secure it, set a `CRON_SECRET` env var in Vercel — Cron sends it automatically as a Bearer token, and the route rejects anything else. That's it; recurring checks now appear each morning.

Prefer to keep scheduling inside the database instead? Enable the `pg_cron` extension in Supabase and run the commented line at the bottom of the migration to schedule `generate_due_tasks()` directly. Use one or the other, not both.
