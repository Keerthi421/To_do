# Production backend

The frontend is deployable on GitHub Pages. The SQL schema in `schema.sql` targets PostgreSQL/Supabase for persistent multi-user synchronization.

## Architecture

Browser -> GitHub Pages CDN -> authenticated database/API -> PostgreSQL

For 5,000 active users:
- keep the frontend static and cacheable;
- use connection pooling (Supavisor/PgBouncer equivalent);
- scope every query by authenticated `user_id`;
- use indexes on `user_id`, `created_at`, `due_at`, `completed`, and `updated_at`;
- use soft deletion so task history is retained;
- use realtime subscriptions for task changes;
- run reminders/calendar synchronization in server-side scheduled jobs;
- never expose service-role database credentials to the browser.

The schema deliberately keeps `created_at` separate from `due_at`: a task entered today can have a due date tomorrow, while remaining permanently visible in All My Tasks history.

## Required frontend environment variables

When the hosted backend is connected, configure these as GitHub Actions repository/environment secrets or variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the public anonymous key belongs in the browser. Service-role keys must remain server-side.
