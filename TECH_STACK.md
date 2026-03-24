# Morning Briefing - Tech Stack Documentation

## Overview
A Korean-language AI morning briefing web application for executives, built with modern web technologies.

## Core Framework & Runtime
- **Framework**: Next.js 16+ (App Router)
- **Runtime**: Node.js
- **Language**: TypeScript 5

## Frontend
- **UI Framework**: React 19
- **Styling**: Tailwind CSS 4
- **CSS Processing**: @tailwindcss/postcss 4
- **Build Tool**: Turbopack (Next.js integrated)

## Backend & API
- **API Route Handler**: Next.js API Routes (server-side)
- **AI/LLM Provider**: Anthropic Claude API
  - Model: claude-3-5-sonnet-20241022
  - SDK: @anthropic-ai/sdk 0.80.0
  - Authentication: API key via environment variable

## Data & Caching
- **Client-side Cache**: localStorage
  - Cache key format: `briefing_{category}_{YYYY-MM-DD}`
  - Duration: 24 hours
  - No external dependency (native browser API)

## Deployment
- **Platform**: Vercel (free tier)
- **Environment Management**: .env.local for API keys
- **Build Output**: Static + On-demand server-rendered routes

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home page (client component)
│   ├── globals.css             # Global styles with Tailwind
│   └── api/
│       └── briefing/
│           └── route.ts        # Claude API endpoint
├── components/
│   ├── BriefingCard.tsx        # Card display with paywall support
│   ├── CategoryTab.tsx         # Category switcher
│   ├── CardSkeleton.tsx        # Loading skeleton UI
│   └── PaywallOverlay.tsx      # Premium unlock modal
├── lib/
│   ├── types.ts                # TypeScript types (from api-schema.ts)
│   ├── claude.ts               # Claude API client
│   └── cache.ts                # localStorage utilities
└── constants/
    └── index.ts                # Categories and config
```

## Key Features

### API Architecture
- **Server-side API calls**: Keeps API key secure (never exposed to client)
- **Error handling**: 5 scenarios covered
  - HTTP 5xx errors
  - 401 Unauthorized (invalid API key)
  - 429 Rate Limited
  - Network failures
  - Sustained failure handling
- **Response format**: Standardized ApiResponse envelope with metadata

### Client Features
- **Category-based briefings**: Economy/시사, Investment/투자
- **Three-tier card system**:
  - Card 1: Free (오늘의핵심)
  - Card 2-3: Premium (영향분석, 실전인사이트)
- **Paywall**: Cards 2-3 show blurred preview with unlock CTA
- **Cache integration**: Check localStorage before API calls
- **Loading states**: Skeleton screens during fetch
- **Error boundaries**: User-friendly error messages

### Content
- **Language**: Korean
- **Target audience**: Executives
- **Content types**: News, market analysis, insights
- **Refresh**: Daily per category

## Environment Variables
```
ANTHROPIC_API_KEY=<your_api_key>
```

Get your API key from https://console.anthropic.com/

## Scripts
- `npm run dev` - Development server (localhost:3000)
- `npm run build` - Production build
- `npm run start` - Run production server
- `npm run lint` - Run ESLint

## Dependencies Summary
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.1 | Framework & routing |
| react | 19.2.4 | UI library |
| react-dom | 19.2.4 | DOM rendering |
| @anthropic-ai/sdk | 0.80.0 | Claude API client |
| tailwindcss | 4 | CSS framework |
| typescript | 5 | Type safety |

## Deployment Checklist for Vercel
1. Push code to Git repository
2. Connect repository to Vercel
3. Set environment variable: `ANTHROPIC_API_KEY`
4. Deploy - Vercel will auto-detect Next.js and build correctly
5. Verify: Routes should be `/` (static) and `/api/briefing` (dynamic)

## Type Safety
- Full TypeScript strict mode enabled
- All API responses typed with ApiResponse<T>
- Component props fully typed
- Environment variables validated at build time

## Browser Support
- Modern browsers with ES2017+ support
- localStorage support required for client-side cache
- Responsive design (mobile-first with Tailwind)
