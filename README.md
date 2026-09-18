# AnyDay

A personal productivity platform inspired by the workflow of modern daily-planner apps, with an Any.do-style information architecture and an original implementation.

## Current milestone

The repository now contains a responsive React/Vite foundation with:

- My Day, Next 7 Days, All Tasks and Calendar navigation
- Personal lists and tags
- Quick task creation
- Task completion, pinning and selection
- Task detail drawer with due-date controls, notes and attachment drop zone
- Smart Suggestions modal
- Settings modal
- Light/dark presentation
- Local persistence for immediate personal use
- Responsive desktop/mobile behavior

The product roadmap also covers advanced recurring reminders, location reminders, Moment, Focus/Pomodoro, AI suggestions/subtasks, calendar integrations, notifications, grocery lists, attachments, authentication, sync and collaboration-ready boards.

## Architecture target

The production version is designed for at least 5,000 active users with a stateless API layer, PostgreSQL for durable state, Redis for caching/queues/rate limiting, object storage for files, and background workers for reminders and asynchronous AI/integration jobs. The UI is intentionally separated from persistence so local storage can later be replaced by the API without redesigning the product.

## Run locally

```bash
npm install
npm run dev
```

Build with:

```bash
npm run build
```

## Product direction

This project recreates the useful task-management workflows and interaction patterns of Any.do while using original application code, branding and assets. It does not copy Any.do source code or proprietary assets.
