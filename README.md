# AnyDay

A personal productivity platform inspired by the workflow of modern daily-planner apps, with an Any.do-style information architecture and an original implementation.

## Access policy

**There is no Premium tier in AnyDay.** All features implemented in this project are available to every user without subscriptions, upgrade prompts, trials, or feature gates.

## Current milestone

The repository contains a responsive React/Vite foundation with:

- My Day, Next 7 Days, All Tasks and Calendar navigation
- Personal lists and tags
- Quick task creation
- Task completion, pinning and selection
- Task detail drawer with due-date controls, notes and attachment drop zone
- Smart Suggestions
- Settings
- Light/dark presentation
- Local persistence for immediate personal use
- Responsive desktop/mobile behavior
- No Premium/upgrade UI

The product roadmap also covers advanced recurring reminders, location reminders, Moment, Focus/Pomodoro, AI suggestions/subtasks, calendar integrations, notifications, grocery lists, attachments, authentication, sync and collaboration-ready boards.

## GitHub-only deployment

The frontend is configured for **GitHub Pages**. Every push to `main` triggers `.github/workflows/deploy.yml`, which installs dependencies, builds the Vite application and deploys `dist/` to GitHub Pages.

After enabling Pages with **GitHub Actions** as the source in the repository settings, the site will be available at:

`https://keerthi421.github.io/To_do/`

No separate hosting provider is required for the static frontend.

## Run locally

```bash
npm install
npm run dev
```

Build with:

```bash
npm run build
```

## Scaling note

GitHub Pages is appropriate for hosting the static frontend, but it is **not a backend/database or WebSocket server**. A true shared multi-user deployment with authentication, server-side synchronization, reminders, uploads and a 5,000-active-user backend will require backend infrastructure in addition to GitHub Pages. The application architecture is being kept ready for that separation.

## Product direction

This project recreates useful task-management workflows and interaction patterns of Any.do while using original application code, branding and assets. It does not copy Any.do source code or proprietary assets.
