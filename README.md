# AnyDay

AnyDay is a personal productivity workspace inspired by the workflow and information architecture of modern daily-planner apps, with original code, branding and assets.

## Access policy

**There is no Premium tier in AnyDay.** Implemented features are available to every user without subscriptions, upgrade prompts, trials or feature gates.

## Implemented workspace

- My Day with daily task planning and quick add
- Next 7 Days board with seven real date columns, horizontal scrolling, filters and completed-task cleanup
- Previous/Next 7-day navigation and Today shortcut
- All My Tasks with permanent history grouped by entry date
- Active / Completed / All history filters
- Monthly calendar with month navigation and clickable task events
- Personal lists and user-created lists
- Tags and user-created tags
- Task detail drawer with title, list, date, reminder, repeat, priority, pin, notes and subtasks
- Persistent subtasks through the Supabase backend
- Browser reminder scheduling when notification permission is granted
- Daily, weekly and monthly recurring-task materialization
- Local-first persistence for immediate use
- Optional Supabase authentication, persistence, realtime synchronization and soft deletion
- Responsive desktop and mobile layouts
- Light/dark presentation
- No Premium/upgrade UI

## Data model

The PostgreSQL/Supabase schema in `src/backend/schema.sql` stores tasks separately from their creation history and due dates. Completed and older tasks are retained instead of disappearing after seven days. Lists, tags, subtasks, attachments and calendar-connection tables are included for the product architecture.

Every task is protected by row-level security. The browser only uses the public Supabase anonymous key; service-role credentials must never be exposed client-side.

## Reminders and recurrence

Browser reminders are scheduled locally when the application is open and notification permission is granted. Recurring tasks are materialized as the next occurrence after completion when a supported rule is present (`daily`, `weekly`, `monthly`, or interval variants). For guaranteed reminders while the browser is closed, a production deployment should add a server-side scheduler/notification worker.

## GitHub Pages deployment

The frontend is configured for GitHub Pages. Every push to `main` triggers `.github/workflows/deploy.yml` to install dependencies and build the Vite application, then deploy through the GitHub Pages deployment action.

Enable **Settings → Pages → Build and deployment → GitHub Actions** once for the repository. Configure these repository/environment variables or secrets when using Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Expected Pages URL:

`https://keerthi421.github.io/To_do/`

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Scaling architecture

GitHub Pages serves the static frontend. Supabase/PostgreSQL provides authentication, persistence, RLS and realtime synchronization. For a 5,000-active-user deployment, use database connection pooling, indexed user/date queries, soft deletion, bounded realtime subscriptions and server-side scheduled jobs for background notifications/calendar synchronization.

## Product direction

AnyDay recreates useful task-management workflows and interaction patterns while using original implementation and assets. It does not copy Any.do source code or proprietary assets.
