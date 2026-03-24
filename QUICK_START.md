# Quick Start Guide

## Get Started in 2 Minutes

### 1. Set API Key
```bash
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY from https://console.anthropic.com/
```

### 2. Install & Run
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Core Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Home page with briefing display |
| `src/app/api/briefing/route.ts` | Claude API endpoint |
| `src/lib/claude.ts` | Claude API client |
| `src/lib/cache.ts` | localStorage cache utilities |
| `src/components/BriefingCard.tsx` | Card component |

## Test API Endpoint

```bash
curl -X POST http://localhost:3000/api/briefing \
  -H "Content-Type: application/json" \
  -d '{"category": "economy"}'
```

## Project Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint

## Key Features

✓ Korean-language AI briefings
✓ Server-side API calls (secure)
✓ localStorage cache (24 hours)
✓ Category-based briefings (Economy, Investment)
✓ Premium paywall (cards 2-3)
✓ Loading skeletons
✓ Error handling
✓ TypeScript type-safe
✓ Tailwind CSS styling
✓ Vercel deployment-ready

## Deployment to Vercel

1. Push to GitHub
2. Import to https://vercel.com/new
3. Add `ANTHROPIC_API_KEY` env var
4. Deploy

## Documentation

- **TECH_STACK.md** - Technology details
- **SETUP.md** - Full setup instructions
- **PROJECT_SUMMARY.md** - Completion summary
