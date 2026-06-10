# Morning Briefing

**English** · [한국어](README.ko.md)

> A daily AI-generated Korean briefing app for executives, built on a shared-cache architecture that keeps API cost flat as the user base grows.

📱 Available on the App Store

---

## Why I built this

My commute runs over an hour each way, twice a day. I wanted a five-minute morning read covering what actually matters — economy and investment context that makes you sharper at work — without the noise of a news feed.

The hard part wasn't the UI. It was the cost model. Most LLM-powered consumer apps generate per-user content, which means API spend scales linearly with users. For a solo-funded side project, that math breaks somewhere around 50 users. I needed a different architecture before I wrote any UI.

## How it works

**Shared daily cache.** All users see the same briefing for a given day. Content is generated once per day per category (Economy, Investment), cached server-side, and read from `localStorage` on the client.

```
Client  → check localStorage("briefing_economy_2026-05-02")
        → cache miss → POST /api/briefing
        → cache hit  → render

Server  → already generated today?
        → yes → serve cached
        → no  → call Claude → store → serve
```

Result: **API cost is roughly fixed per day regardless of user count**. The 1,000th user costs the same as the first.

**Three-tier card system.** Card 1 is free, cards 2–3 sit behind a blurred paywall — enough free value to bring users back, with a clear upgrade path.

**Browse past briefings.** Every generated day is archived for 365 days. A date stepper, left/right swipe, and `?date=` deep links let you walk back through previous mornings — past days load straight from the archive and never re-generate.

**Capacitor for iOS.** The same Next.js codebase ships as a native iOS app on the App Store via Capacitor 8, with offline support, push notifications, local notifications, and badge counts through Capacitor plugins.

## Key features

- Daily refresh per category with automatic cache invalidation by date key
- Past-briefing archive (365 days) with date stepper, swipe, and shareable `?date=` links
- Server-side API key handling — never exposed to the client
- Skeleton loading states + paywall blur for smooth perceived performance
- iOS native delivery via Capacitor with offline mode and push notifications
- Five distinct error states handled explicitly (rate limit, auth, network, server, generation)

## What I learned

Designing the cache layer **before writing any UI** was the single most important decision in this project. I had a working interface in a few hours and a sustainable cost structure on day one. If I'd shipped per-user generation first and tried to retrofit caching later, the data model would have fought me at every step.

Second lesson: a tiny paywall with one genuinely useful free card converts better than I expected. People want to see something working before they decide whether to pay — a fully blurred experience just makes them close the app.

## Stack

`Next.js 16 (App Router)` · `React 19` · `TypeScript 5` · `Tailwind CSS 4` · `Anthropic Claude API` · `Capacitor 8 (iOS)` · `Vercel`

## Project structure

```
src/
├── app/
│   ├── layout.tsx              Root layout with Korean metadata
│   ├── page.tsx                Home page (client component)
│   └── api/briefing/route.ts   Server-side Claude endpoint
├── components/
│   ├── BriefingCard.tsx        Card display with paywall support
│   ├── CategoryTab.tsx         Category switcher
│   ├── CardSkeleton.tsx        Loading skeleton
│   └── PaywallOverlay.tsx      Premium unlock modal
├── lib/
│   ├── claude.ts               Claude API client
│   ├── cache.ts                localStorage utilities
│   └── types.ts                Shared TypeScript types
└── constants/index.ts          Categories and config

ios/                            Capacitor iOS project
public/sw.js                    Service worker for offline mode
```

---

Built with Claude Code as the primary dev environment.  
Author: [Hyun (qlemql)](https://github.com/qlemql) · taehyun_fe@naver.com
