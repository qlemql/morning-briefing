# Morning Briefing

**English** · [한국어](README.ko.md)

> A daily AI-generated Korean briefing app for executives, built on a shared-cache architecture that keeps API cost flat as the user base grows — with a layered reliability setup so a solo maintainer isn't the single point of failure.

📱 Available on the App Store

---

## Why I built this

My commute runs over an hour each way, twice a day. I wanted a five-minute morning read covering what actually matters — economy and investment context that makes you sharper at work — without the noise of a news feed.

The hard part wasn't the UI. It was the cost model. Most LLM-powered consumer apps generate per-user content, which means API spend scales linearly with users. For a solo-funded side project, that math breaks somewhere around 50 users. I needed a different architecture before I wrote any UI.

## How it works

**Shared daily cache.** All users see the same briefing for a given day. Content is generated once per day per category, cached in Upstash Redis server-side, and read from `localStorage` on the client.

```
Client  → check localStorage("briefing_economy_2026-06-10")
        → cache miss → POST /api/briefing
        → cache hit  → render

Server  → already generated today? (Redis)
        → yes → serve cached
        → no  → call Claude → store → serve
```

Result: **API cost is roughly fixed per day regardless of user count.** The 1,000th user costs the same as the first — and a per-day/per-month budget guard hard-caps spend so a runaway loop can't surprise me.

**Focused on one category, built for many.** The app currently ships a single daily category — Economy / Current Affairs — because that's where daily freshness earns its cost. The category system is config-driven (an `enabled` flag), so Investment and Lifestyle/Tech are one line away from coming back.

**Free, donation-supported.** Every card is free. It started as a card-2/3 paywall; I pivoted to a donation model — one genuinely useful read per day, with an optional "buy me a coffee" tip.

**Browse past briefings.** Every generated day is archived for 365 days. A date stepper, left/right swipe, and `?date=` deep links let you walk back through previous mornings — past days load straight from the archive and never re-generate, so browsing history costs nothing.

**Reliability without a babysitter.** Daily generation runs on a Vercel cron, backed by a second "watchdog" cron and an external GitHub Action that triggers and verifies freshness independently of the hosting platform — a dead-man's switch that pings me on Telegram if a morning ever goes stale. An evergreen fallback keeps the app serving even when generation fails.

**Capacitor for iOS.** The same Next.js codebase ships as a native iOS app via Capacitor 8 — offline support, push notifications, local notifications, and badge counts through Capacitor plugins.

## Key features

- Shared daily cache (Upstash Redis) with date-keyed invalidation — flat API cost
- Per-day / per-month budget guard with a graceful evergreen fallback
- Past-briefing archive (365 days) with date stepper, swipe, and shareable `?date=` links
- Layered reliability: Vercel cron + watchdog cron + external GitHub Action heartbeat + Telegram alerts
- Server-side API key handling — never exposed to the client
- iOS native delivery via Capacitor with offline mode and push notifications
- Admin dashboard: budget, analytics, system health, manual re-generation

## What I learned

Designing the cache layer **before writing any UI** was the single most important decision in this project. I had a working interface in a few hours and a sustainable cost structure on day one. If I'd shipped per-user generation first and tried to retrofit caching later, the data model would have fought me at every step.

The second lesson came the hard way: **a scheduled job that fails silently is worse than no job.** My daily generation quietly missed a few mornings — users saw stale fallback content and I had no idea until I happened to look. The fix wasn't a bigger retry; it was designing for "how will I know when this breaks?" — an in-app watchdog, an external heartbeat that doesn't depend on the same platform that just failed, and alerts that reach my phone. The happy path was the easy 80%.

## Stack

`Next.js 16 (App Router)` · `React 19` · `TypeScript 5` · `Tailwind CSS 4` · `Anthropic Claude API` · `Upstash Redis` · `Capacitor 8 (iOS)` · `Vercel` · `GitHub Actions`

## Project structure

```
src/
├── app/
│   ├── page.tsx                 Home — single-category feed + date navigation
│   ├── admin/page.tsx           Ops dashboard (budget, health, re-generate)
│   ├── archive/                 Past briefings (index + /archive/[date])
│   └── api/
│       ├── briefing/route.ts    Today's briefing (generate or serve cached)
│       ├── archive/route.ts     Past briefing by date (365-day store)
│       └── cron/route.ts        Daily generation (idempotent, watchdog-safe)
├── components/                  BriefingCard, CategoryTab, CardSkeleton, …
├── lib/
│   ├── claude.ts                Claude API client (web search + retries)
│   ├── server-cache.ts          Redis-backed daily cache + 365-day archive
│   ├── budget.ts                Per-day / per-month spend guard
│   ├── alert.ts                 Owner alerts (Telegram)
│   ├── kv.ts                    Upstash Redis wrapper
│   └── cache.ts / types.ts      Client cache utils + shared types
└── constants/index.ts           Categories (enabled flag) + config

.github/workflows/daily-briefing.yml   External trigger + freshness heartbeat
vercel.json                            Cron schedules (daily + watchdog)
ios/                                   Capacitor iOS project
```

---

Built with Claude Code as the primary dev environment.  
Author: [Hyun (qlemql)](https://github.com/qlemql) · taehyun_fe@naver.com
