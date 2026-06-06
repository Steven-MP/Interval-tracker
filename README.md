# Interval Tracker

A PWA for tracking time intervals between recurring events. Create named items, restart their timer whenever the event occurs, and view stats over time.

## Features

- **Items** — create named things you want to track (e.g. "Oil change", "Haircut")
- **Intervals** — each restart records a completed interval; live counters show time since the last one
- **Stats** — per-item view shows interval count, average, shortest, and longest durations
- **Groups** — organise items into collapsible, drag-and-drop groups
- **Restart from** — back-date a restart using a datetime picker
- **PWA** — installable on iPhone via Safari "Add to Home Screen"; runs standalone
- **Dark mode** — follows system preference and updates reactively

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — React full-stack framework
- [Convex](https://convex.dev) — backend database and real-time queries
- [better-auth](https://better-auth.com) — authentication (email/password, session management)
- [shadcn/ui](https://ui.shadcn.com) — component library (new-york style, zinc)
- [Tailwind CSS v4](https://tailwindcss.com)
- [@dnd-kit](https://dndkit.com) — drag-and-drop for items and groups
- [Sonner](https://sonner.emilkowal.ski) — toast notifications
- [Biome](https://biomejs.dev) — linting and formatting
- [Bun](https://bun.sh) — package manager and runtime

## Convex Setup

Create a project in the [Convex dashboard](https://dashboard.convex.dev) and run:

```bash
npx convex dev
```

This deploys the schema (`convex/schema.ts`) and functions automatically — no manual collection or index setup required.

## Environment

Create `.env.local`:

```
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=https://your-deployment.convex.site
VITE_BETTER_AUTH_URL=http://localhost:3002
```

## Development

```bash
bun install
bun dev        # starts on port 3002
```

## Build

```bash
bun run build
bun run preview
```

## Tests

```bash
bun test
```

Tests use Bun's built-in Jest-compatible runner with [happy-dom](https://github.com/capricorn86/happy-dom) for the DOM environment and [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro) for component rendering.

| File | Coverage |
|---|---|
| `src/lib/utils.test.ts` | `cn()` — class merging, falsy values, Tailwind conflict resolution |
| `src/components/shared/LiveCounter.test.tsx` | `formatDuration()` — all duration units, partial-second flooring, negative clamping; `LiveCounter` — rendered output |
| `src/routes/index.test.ts` | `applyOrder()`, `applyItemOrder()` — ID-based ordering, unknown IDs, remainder appending |
| `src/routes/login.test.tsx` | `LoginPage` — mode switching, form submission, error display and clearing, post-login navigation |

## Lint

```bash
bun run lint   # biome lint
bun run check  # biome check (lint + format)
```

## Project Structure

```
src/
  routes/
    __root.tsx      # root layout, auth redirect, PWA meta, dark mode
    index.tsx       # home — item list with groups and live counters
    $itemId.tsx     # item detail — stats, restart, history
    login.tsx       # email/password auth
  components/
    layout/
      Navbar.tsx
    shared/
      LiveCounter.tsx
    ui/             # shadcn components
  lib/
    auth/
      auth-client.ts    # better-auth client
      auth-context.tsx  # AuthProvider, useAuth
public/
  manifest.json
  icon-192.png
  icon-512.png
```
