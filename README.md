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
- [Appwrite](https://appwrite.io) — auth and database (client SDK, browser session)
- [shadcn/ui](https://ui.shadcn.com) — component library (new-york style, zinc)
- [Tailwind CSS v4](https://tailwindcss.com)
- [@dnd-kit](https://dndkit.com) — drag-and-drop for items and groups
- [Sonner](https://sonner.emilkowal.ski) — toast notifications
- [Biome](https://biomejs.dev) — linting and formatting
- [Bun](https://bun.sh) — package manager and runtime

## Appwrite Setup

Create a project in the [Appwrite console](https://cloud.appwrite.io) and configure the following:

**Auth** — enable Email/Password under Auth → Settings

**Database** — create a database, then add two collections:

| Collection | Attribute | Type | Required |
|---|---|---|---|
| `items` | `name` | String 255 | Yes |
| `items` | `userId` | String 36 | Yes |
| `items` | `groupId` | String 36 | No |
| `intervals` | `itemId` | String 36 | Yes |
| `intervals` | `userId` | String 36 | Yes |
| `intervals` | `startedAt` | DateTime | Yes |
| `intervals` | `endedAt` | DateTime | No |
| `groups` | `name` | String 255 | Yes |
| `groups` | `userId` | String 36 | Yes |

Add a `userId` index on each collection. Set permissions to role `users` → Read, Create, Update, Delete on all three.

**Platform** — add a Web platform with hostname `localhost` (and your production domain when deploying).

## Environment

Copy `.env.local.example` or create `.env.local`:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
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
    appwrite/
      client.ts     # Appwrite client, collection IDs, nowISO()
    auth/
      auth-context.tsx
public/
  manifest.json
  icon-192.png
  icon-512.png
```
