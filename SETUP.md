# Setup Guide - Morning Briefing

## Prerequisites
- Node.js 18+
- npm or yarn
- Anthropic API key (free at https://console.anthropic.com/)

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```

## Deployment to Vercel

### 1. Push to Git
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Connect to Vercel
- Visit https://vercel.com/new
- Import your repository
- Select "Next.js" framework (auto-detected)

### 3. Add Environment Variables
In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = `sk-ant-...`

### 4. Deploy
Click "Deploy" - Vercel will automatically build and deploy

## Project Structure

```
morning-briefing/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Tailwind styles
│   │   └── api/briefing/       # API endpoints
│   ├── components/             # React components
│   │   ├── BriefingCard.tsx
│   │   ├── CategoryTab.tsx
│   │   ├── CardSkeleton.tsx
│   │   └── PaywallOverlay.tsx
│   ├── lib/                    # Utilities
│   │   ├── types.ts            # TypeScript types
│   │   ├── claude.ts           # Claude API client
│   │   └── cache.ts            # localStorage cache
│   └── constants/              # App constants
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
└── .env.local.example
```

## Key Files & Components

### API Route: `/api/briefing`
- **Method**: POST
- **Request**: `{ category: "economy" | "investment", date?: "YYYY-MM-DD" }`
- **Response**: `ApiResponse<BriefingCategory>`
- **Features**:
  - Server-side Claude API calls (API key never exposed)
  - Error handling for 5xx, 401, 429, network failures
  - Response envelope with metadata

### Frontend Components
- **BriefingCard**: Individual card with paywall blur effect
- **CategoryTab**: Category switcher tabs
- **CardSkeleton**: Loading skeleton UI
- **PaywallOverlay**: Premium unlock modal

### Client-side Cache
- Uses localStorage with key format: `briefing_{category}_{YYYY-MM-DD}`
- 24-hour cache duration
- Auto-populated when fetching from API

## Testing the API

### Using cURL
```bash
curl -X POST http://localhost:3000/api/briefing \
  -H "Content-Type: application/json" \
  -d '{"category": "economy"}'
```

### Expected Response
```json
{
  "meta": {
    "version": "1.0",
    "status": "success",
    "processingTimeMs": 1234
  },
  "data": {
    "category": "economy",
    "categoryName": "경제/시사",
    "generatedAt": "2024-03-24T...",
    "cards": [
      {
        "id": "card_1",
        "number": 1,
        "title": "제목",
        "content": "내용",
        "summary": "요약",
        "type": "오늘의핵심",
        "source": "출처"
      },
      // ... more cards
    ]
  }
}
```

## Environment Variables

### Required
- `ANTHROPIC_API_KEY`: Your Anthropic API key

### Optional
- `NODE_ENV`: Set to "production" for production builds

## Troubleshooting

### "API key not found" error
- Ensure `.env.local` exists in project root
- Check that `ANTHROPIC_API_KEY` is set correctly
- Restart dev server after updating `.env.local`

### Build fails with TypeScript errors
- Run `npm run build` to see full errors
- Check that all imports are correct
- Ensure all types are properly imported

### Cache not working
- Check browser DevTools → Application → Local Storage
- Clear cache with: `localStorage.clear()`
- Check console for cache-related errors

## Development Notes

### Adding New Categories
1. Update `CATEGORIES` in `src/constants/index.ts`
2. Update `GenerateBriefingRequest` type in `src/lib/types.ts`
3. Update Claude prompt in `src/lib/claude.ts` if needed

### Customizing Card UI
- Edit styling in `src/components/BriefingCard.tsx`
- Tailwind classes are available for responsive design
- Color scheme uses blue/purple/green for card types

### Extending Cache Logic
- Modify `src/lib/cache.ts` for different cache strategies
- Update cache key format if needed
- Adjust 24-hour duration in `CACHE_CONFIG`

## Production Checklist
- [ ] API key set in Vercel environment variables
- [ ] Error handling tested for all 5 scenarios
- [ ] Cache strategy verified
- [ ] Mobile responsiveness tested
- [ ] Page builds without errors (`npm run build`)
- [ ] Korean text displays correctly
