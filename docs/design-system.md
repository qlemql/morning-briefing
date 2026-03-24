# Morning Briefing Design System

**Document Version:** 1.0
**Last Updated:** 2026-03-24
**Target Platform:** Mobile-first web app (Next.js + Tailwind CSS)
**Language:** Korean (KO)

---

## 1. Color Palette

All colors are defined as Tailwind CSS values for direct implementation in `tailwind.config.js`.

### 1.1 Brand Colors

| Purpose | Tailwind Class | Hex Value | Usage |
|---------|-----------------|-----------|-------|
| Primary Brand | `bg-indigo-600` | #4F46E5 | CTAs, active states, emphasis |
| Primary Light | `bg-indigo-50` | #EEF2FF | Backgrounds, hover states |
| Primary Dark | `bg-indigo-900` | #312E81 | Text on light backgrounds |

### 1.2 Category Colors

Each category has its own color for number badges and visual differentiation:

| Category | Korean | Badge Color | Tailwind | Hex | Text Color |
|----------|--------|-------------|----------|-----|-----------|
| Economy | 경제 | Teal | `bg-teal-500` | #14B8A6 | `text-white` |
| Investment | 투자 | Amber | `bg-amber-500` | #F59E0B | `text-white` |
| Markets | 시장동향 | Emerald | `bg-emerald-500` | #10B981 | `text-white` |
| Tech | 기술 | Purple | `bg-purple-500` | #A855F7 | `text-white` |

### 1.3 Neutral Colors

| Purpose | Tailwind | Hex | Usage |
|---------|----------|-----|-------|
| Background (Default) | `bg-white` | #FFFFFF | Page background |
| Surface (Cards) | `bg-white` | #FFFFFF | Card backgrounds |
| Surface Hover | `bg-gray-50` | #F9FAFB | Card hover state |
| Border | `border-gray-200` | #E5E7EB | Card borders, dividers |
| Border Dark | `border-gray-300` | #D1D5DB | Input borders, emphasis |
| Text Primary | `text-gray-900` | #111827 | Headings, primary text |
| Text Secondary | `text-gray-600` | #4B5563 | Body text, descriptions |
| Text Tertiary | `text-gray-500` | #6B7280 | Captions, metadata |
| Text Disabled | `text-gray-400` | #9CA3AF | Disabled states |
| Divider | `bg-gray-100` | #F3F4F6 | Section dividers |

### 1.4 Status Colors

| Status | Tailwind | Hex | Usage |
|--------|----------|-----|-------|
| Success | `bg-green-500` | #10B981 | Completion, success messages |
| Warning | `bg-yellow-500` | #EAB308 | Alerts, pending states |
| Error | `bg-red-500` | #EF4444 | Errors, critical alerts |
| Info | `bg-blue-500` | #3B82F6 | Information, neutral alerts |

### 1.5 Paywall Overlay

| Element | Tailwind | Hex | Opacity |
|---------|----------|-----|---------|
| Overlay Background | `bg-white` | #FFFFFF | 95% (`opacity-95`) |
| Blur Effect | CSS Filter | N/A | `blur(12px)` |
| Scrim (dark) | `bg-black` | #000000 | 5% (`opacity-5`) |

### 1.6 Pastel Accent Colors (Optional, for variety)

For future card variety or highlights:

| Color | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| Pastel Blue | `bg-blue-100` | #DBEAFE | Backgrounds |
| Pastel Green | `bg-green-100` | #DCFCE7 | Backgrounds |
| Pastel Pink | `bg-pink-100` | #FCE7F3 | Backgrounds |
| Pastel Yellow | `bg-yellow-100` | #FEF3C7 | Backgrounds |

---

## 2. Typography System

Uses system fonts with Noto Sans KR for Korean text. Optimized for mobile reading.

### 2.1 Font Stack

```css
/* Tailwind config */
fontFamily: {
  'sans': [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Noto Sans KR',
    'sans-serif'
  ],
  'serif': [
    'Georgia',
    'Noto Serif KR',
    'serif'
  ],
  'mono': [
    'Menlo',
    'Monaco',
    'Courier New',
    'monospace'
  ]
}
```

### 2.2 Heading Sizes

#### Page Title (Hero/Section heading)
- **Tailwind:** `text-4xl font-bold`
- **Size:** 36px / 44px line-height
- **Font Weight:** 700 (bold)
- **Korean Example:** "오늘의 브리핑"
- **Usage:** Page header, hero section

#### Section Title (Category heading)
- **Tailwind:** `text-2xl font-bold`
- **Size:** 24px / 32px line-height
- **Font Weight:** 700 (bold)
- **Korean Example:** "경제/시사"
- **Usage:** Category headers, section dividers

#### Card Title (BriefingCard)
- **Tailwind:** `text-xl font-bold`
- **Size:** 20px / 28px line-height
- **Font Weight:** 700 (bold)
- **Max lines:** 2 (truncate with ellipsis on 3rd)
- **Korean Example:** "삼성전자 분기 실적 사상 최대 호실적"
- **Usage:** Main card heading

#### Subheading (Card subtitle/summary)
- **Tailwind:** `text-base font-semibold`
- **Size:** 16px / 24px line-height
- **Font Weight:** 600 (semibold)
- **Korean Example:** "영향분석"
- **Usage:** Card type label, subsection headers

### 2.3 Body Text Sizes

#### Body Large (Main content)
- **Tailwind:** `text-base font-normal`
- **Size:** 16px / 24px line-height
- **Font Weight:** 400 (normal)
- **Max lines:** 3 (truncate with ellipsis on 4th, or show full in expanded)
- **Korean Example:** "삼성전자가 2024년 1분기 영업이익 7조 3천억원으로 사상 최고 실적을 기록했습니다."
- **Usage:** Card content, body text, main descriptions

#### Body Base (Smaller content)
- **Tailwind:** `text-sm font-normal`
- **Size:** 14px / 20px line-height
- **Font Weight:** 400 (normal)
- **Korean Example:** "금융통계 발표"
- **Usage:** Secondary descriptions, metadata

### 2.4 Caption Sizes

#### Caption (Badges, metadata)
- **Tailwind:** `text-xs font-medium`
- **Size:** 12px / 16px line-height
- **Font Weight:** 500 (medium)
- **Korean Example:** "어제의 브리핑"
- **Usage:** Date labels, small badges, metadata

#### Tiny Label (Badge text)
- **Tailwind:** `text-xs font-bold`
- **Size:** 12px / 16px line-height
- **Font Weight:** 700 (bold)
- **Korean Example:** "1"
- **Usage:** Category badges, number circles

### 2.5 Font Weight Hierarchy

| Weight | Tailwind Class | Usage |
|--------|-----------------|-------|
| 400 | `font-normal` | Body text, descriptions |
| 500 | `font-medium` | Labels, captions, small headings |
| 600 | `font-semibold` | Subtitles, secondary headings |
| 700 | `font-bold` | Main headings, card titles, emphasis |
| 900 | `font-black` | Not recommended; rarely used |

---

## 3. Spacing System

Based on Tailwind's default spacing scale (4px increments).

### 3.1 Spacing Scale

| Scale | Pixels | Tailwind | Usage |
|-------|--------|----------|-------|
| XXS | 4px | `p-1` | Minimal padding (badges) |
| XS | 8px | `p-2` | Small gaps (icon padding) |
| SM | 12px | `p-3` | Small padding (compact elements) |
| Base | 16px | `p-4` | Default padding, card side margins |
| MD | 20px | `p-5` | Medium padding (cards, sections) |
| LG | 24px | `p-6` | Large padding (major sections) |
| XL | 32px | `p-8` | Extra large padding (hero sections) |
| 2XL | 40px | `p-10` | Large section gaps |
| 3XL | 48px | `p-12` | Very large section gaps |

### 3.2 Card Layout Spacing

| Element | Value | Tailwind | Notes |
|---------|-------|----------|-------|
| **Card Side Padding** | 16px | `px-4` | Matches 600px → mobile conversion |
| **Card Top/Bottom Padding** | 20px | `py-5` | Visual breathing room |
| **Gap Between Cards** | 12px | `gap-3` | Compact stack for mobile |
| **Card Border Radius** | 12px | `rounded-lg` | Modern, not too sharp |
| **Card Shadow** | subtle | `shadow-sm` | Light elevation |

### 3.3 Section Spacing

| Section | Top Margin | Bottom Margin | Tailwind |
|---------|-----------|---------------|----------|
| Page Header | 16px | 24px | `my-6` |
| Category Section | 24px | 16px | `mt-6 mb-4` |
| Card Stack | 12px between | N/A | `gap-3` |
| Section Divider | 32px | 32px | `my-8` |

### 3.4 Safe Area Spacing (Mobile)

| Position | Value | Purpose |
|----------|-------|---------|
| **Top** | 16px + status bar | Header below system elements |
| **Bottom** | 16px + home indicator | Footer above home indicator |
| **Left/Right** | 16px | Edge safety margin |

```css
/* Safe area considerations */
.safe-area-top {
  padding-top: max(16px, env(safe-area-inset-top));
}

.safe-area-bottom {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

---

## 4. Component Specifications

### 4.1 BriefingCard (Most Critical)

The primary content card component. Displays briefing information with progressive disclosure.

#### Layout

```
┌─────────────────────────────────────┐
│ 1                                   │  ← Number badge (category color)
│ ┌─────────────────────────────────┐ │
│ │ 삼성전자 분기 실적 사상 최대     │ │  ← Title (bold)
│ │ 호실적                          │ │
│ ├─────────────────────────────────┤ │
│ │ 영향분석                        │ │  ← Card type label
│ │ 삼성전자가 2024년 1분기 영업이  │ │  ← Summary (1 line)
│ │ 익 7조 3천억원으로 사상 최고...  │ │
│ │ [확인 이미지/아이콘]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 어제의 브리핑 · 3월 23일 월요일      │  ← Metadata (optional)
└─────────────────────────────────────┘
```

#### Container

- **Width:** Full width on mobile (minus safe margins), max 480px on desktop
- **Tailwind:** `w-full md:max-w-md`
- **Padding:** 20px top/bottom, 16px left/right
- **Tailwind:** `py-5 px-4`
- **Background:** White
- **Tailwind:** `bg-white`
- **Border:** 1px solid, light gray
- **Tailwind:** `border border-gray-200`
- **Border Radius:** 12px
- **Tailwind:** `rounded-lg`
- **Shadow:** Subtle elevation
- **Tailwind:** `shadow-sm`
- **Gap Between Interior Elements:** 12px
- **Tailwind:** `space-y-3`

#### Number Badge (Top-Left Corner)

- **Shape:** Circle
- **Size:** 48px diameter
- **Position:** Absolutely positioned top-left, 16px from edges
- **Tailwind:** `absolute -top-2 -left-2 h-12 w-12`
- **Background:** Category-specific color
- **Tailwind:** `bg-teal-500` (for 경제), `bg-amber-500` (for 투자), etc.
- **Content:** Large bold number (1, 2, 3, etc.)
- **Tailwind:** `text-xl font-bold text-white`
- **Shadow:** Subtle drop shadow
- **Tailwind:** `shadow-md`
- **Z-index:** Above card
- **Tailwind:** `z-10`

```jsx
// Example: Number Badge
<div className="absolute -top-2 -left-2 h-12 w-12 rounded-full bg-teal-500 shadow-md flex items-center justify-center">
  <span className="text-xl font-bold text-white">1</span>
</div>
```

#### Title Section

- **Text:** Bold, large
- **Tailwind:** `text-xl font-bold text-gray-900`
- **Max Lines:** 2 (overflow hidden, ellipsis)
- **Tailwind:** `line-clamp-2`
- **Line Height:** 28px
- **Tailwind:** `leading-7`

```jsx
<h3 className="text-xl font-bold text-gray-900 line-clamp-2">
  삼성전자 분기 실적 사상 최대 호실적
</h3>
```

#### Card Type Label

- **Text:** Semibold, smaller
- **Tailwind:** `text-base font-semibold text-indigo-600`
- **Background:** Light indigo (optional pill style)
- **Tailwind:** `bg-indigo-50 px-2 py-1 rounded` (optional)
- **Examples:** "오늘의 핵심", "영향분석", "실전인사이트"

```jsx
<span className="text-base font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
  영향분석
</span>
```

#### Summary Text (Collapsed)

- **Text:** Regular weight, secondary color
- **Tailwind:** `text-base font-normal text-gray-600`
- **Max Lines:** 1 (truncate with ellipsis)
- **Tailwind:** `truncate` or `line-clamp-1`
- **Visible Only:** In collapsed card view

```jsx
<p className="text-base font-normal text-gray-600 line-clamp-1">
  삼성전자가 2024년 1분기 영업이익 7조 3천억원으로...
</p>
```

#### Full Content (Expanded)

- **Text:** Regular weight, primary color
- **Tailwind:** `text-base font-normal text-gray-900`
- **Line Height:** 24px
- **Tailwind:** `leading-6`
- **Visible Only:** In expanded/modal view
- **Allow:** Full text wrapping, multiple paragraphs

```jsx
<div className="text-base font-normal text-gray-900 leading-6 space-y-3">
  {/* Full content paragraphs */}
</div>
```

#### Metadata Row (Optional)

- **Text:** Small caption, tertiary color
- **Tailwind:** `text-xs font-medium text-gray-500`
- **Example:** "어제의 브리핑 · 3월 23일 월요일"
- **Position:** Bottom of card
- **Display:** Flex with dot separator

```jsx
<div className="flex items-center gap-2 text-xs font-medium text-gray-500">
  <span>어제의 브리핑</span>
  <span>·</span>
  <span>3월 23일 월요일</span>
</div>
```

#### States

**Default (Card 1 - Visible)**
- Full opacity, all content visible
- Tailwind: `opacity-100`
- Cursor: `cursor-pointer`

**Paywall (Cards 2-3 - Blurred)**
- Content blurred, title still visible
- Overlay button with CTA
- Tailwind: `relative group`

**Yesterday's Briefing**
- Add badge: "어제의 브리핑"
- Slight opacity reduction (optional)
- Tailwind: `opacity-80`

**Loading (Skeleton)**
- Placeholder shape
- Pulse animation
- Same dimensions as real card

**Error**
- Show icon + error message
- Retry button available

---

### 4.2 CategoryTab (Navigation)

Horizontal tabs for filtering by category.

#### Layout

```
┌────────────────────────────────────┐
│ 경제/시사  |  투자                 │
│     ‾‾‾‾                          │  ← Active underline
└────────────────────────────────────┘
```

#### Container

- **Width:** Full width
- **Tailwind:** `w-full`
- **Padding:** 16px horizontal
- **Tailwind:** `px-4`
- **Background:** White
- **Tailwind:** `bg-white`
- **Border Bottom:** 1px solid gray
- **Tailwind:** `border-b border-gray-200`
- **Display:** Flex, gap 24px
- **Tailwind:** `flex gap-6`
- **Position:** Sticky top
- **Tailwind:** `sticky top-0 z-20`

#### Tab (Inactive)

- **Text:** 16px, semibold
- **Tailwind:** `text-base font-semibold`
- **Color:** Secondary gray
- **Tailwind:** `text-gray-600`
- **Padding:** 12px horizontal, 8px vertical
- **Tailwind:** `px-3 py-2`
- **Border:** None
- **Cursor:** `cursor-pointer`
- **Transition:** Color 200ms
- **Tailwind:** `transition-colors duration-200`

#### Tab (Active)

- **Text:** 16px, bold
- **Tailwind:** `text-base font-bold`
- **Color:** Primary text
- **Tailwind:** `text-gray-900`
- **Border Bottom:** 3px solid primary
- **Tailwind:** `border-b-4 border-indigo-600`
- **Padding:** 12px horizontal, 8px vertical
- **Tailwind:** `px-3 py-2`
- **Margin Bottom:** -1px to align border
- **Tailwind:** `mb-px`

```jsx
<nav className="sticky top-0 z-20 w-full border-b border-gray-200 bg-white">
  <div className="flex gap-6 px-4">
    <button
      className={`py-2 px-3 text-base font-semibold transition-colors duration-200 border-b-4 border-transparent ${
        activeTab === 'economy'
          ? 'text-gray-900 border-b-4 border-indigo-600 font-bold'
          : 'text-gray-600'
      }`}
      onClick={() => setActiveTab('economy')}
    >
      경제/시사
    </button>
    <button
      className={`py-2 px-3 text-base font-semibold transition-colors duration-200 border-b-4 border-transparent ${
        activeTab === 'investment'
          ? 'text-gray-900 border-b-4 border-indigo-600 font-bold'
          : 'text-gray-600'
      }`}
      onClick={() => setActiveTab('investment')}
    >
      투자
    </button>
  </div>
</nav>
```

---

### 4.3 PaywallOverlay (Content Gating)

Blur and CTA overlay for cards 2-3.

#### Layout

```
┌───────────────────────────────────┐
│ 2                                 │
│ ┌─────────────────────────────────┐
│ │ 삼성전자 분기 실적 사상 최대     │ ← Title visible
│ │ ═════════════════════════════════ │ ← Blur starts
│ │ 영향분석                        │ (blurred)
│ │ [BLURRED CONTENT]               │
│ │                                 │
│ │  ┌─────────────────────────────┐│
│ │  │   전체 브리핑 보기           ││ ← CTA button
│ │  └─────────────────────────────┘│
│ └─────────────────────────────────┘
└───────────────────────────────────┘
```

#### Container

- **Position:** Absolute, overlay
- **Tailwind:** `absolute inset-0`
- **Background:** Semi-transparent white
- **Tailwind:** `bg-white/95` (95% opacity)
- **Backdrop Filter:** Blur
- **CSS:** `backdrop-filter: blur(12px)`
- **Pointer:** Allow clicks
- **Tailwind:** `cursor-pointer`
- **Z-index:** Above card content
- **Tailwind:** `z-40`
- **Display:** Flex, centered
- **Tailwind:** `flex items-center justify-center`

#### Content (Title Peek)

- **Background:** White/no blur on title area
- **Tailwind:** `bg-white`
- **Padding:** Add white background to top section
- **Result:** Title visible, content blurred below

#### CTA Button

- **Text:** "전체 브리핑 보기"
- **Style:** Primary button
- **Background:** Indigo
- **Tailwind:** `bg-indigo-600 hover:bg-indigo-700`
- **Text Color:** White
- **Tailwind:** `text-white font-bold`
- **Padding:** 12px horizontal, 10px vertical
- **Tailwind:** `px-4 py-2`
- **Border Radius:** 8px
- **Tailwind:** `rounded-md`
- **Shadow:** Subtle
- **Tailwind:** `shadow-md`
- **Transition:** Background 200ms
- **Tailwind:** `transition-colors duration-200`

```jsx
// PaywallOverlay Component
<div className="relative">
  {/* Card content */}

  {/* Paywall overlay */}
  {showPaywall && (
    <div className="absolute inset-0 z-40 rounded-lg bg-white/95 backdrop-blur-sm flex items-center justify-center">
      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-md shadow-md transition-colors duration-200">
        전체 브리핑 보기
      </button>
    </div>
  )}
</div>
```

---

### 4.4 CardSkeleton (Loading State)

Placeholder shown while content loads.

#### Layout

```
┌───────────────────────────────────┐
│ ◯                                 │  ← Circular skeleton
│ ┌───────────────────────────────┐ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │  ← Title skeleton
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓                 │ │
│ ├───────────────────────────────┤ │
│ │ ▓▓▓▓▓▓▓▓▓                   │ │  ← Label skeleton
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │  ← Content skeleton
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓                 │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

#### Badge (Circle)

- **Size:** 48px diameter
- **Tailwind:** `h-12 w-12 rounded-full`
- **Background:** Light gray
- **Tailwind:** `bg-gray-200`
- **Animation:** Pulse
- **Tailwind:** `animate-pulse`

#### Title Skeleton

- **Height:** 24px
- **Tailwind:** `h-6`
- **Width:** 90%
- **Tailwind:** `w-11/12`
- **Border Radius:** 4px
- **Tailwind:** `rounded`
- **Background:** Light gray
- **Tailwind:** `bg-gray-200`
- **Animation:** Pulse
- **Tailwind:** `animate-pulse`

#### Label Skeleton

- **Height:** 20px
- **Tailwind:** `h-5`
- **Width:** 40%
- **Tailwind:** `w-2/5`
- **Border Radius:** 4px
- **Tailwind:** `rounded`
- **Background:** Light gray
- **Tailwind:** `bg-gray-200`
- **Animation:** Pulse
- **Tailwind:** `animate-pulse`

#### Content Skeleton (2-3 lines)

- **Height:** 16px per line
- **Tailwind:** `h-4`
- **Width:** 95% (first), 90% (second), 60% (third)
- **Border Radius:** 4px
- **Tailwind:** `rounded`
- **Background:** Light gray
- **Tailwind:** `bg-gray-200`
- **Animation:** Pulse
- **Tailwind:** `animate-pulse`

```jsx
// CardSkeleton Component
<div className="relative w-full py-5 px-4 border border-gray-200 rounded-lg shadow-sm bg-white">
  {/* Badge skeleton */}
  <div className="absolute -top-2 -left-2 h-12 w-12 rounded-full bg-gray-200 animate-pulse" />

  {/* Content skeletons */}
  <div className="space-y-3 pt-8">
    <div className="h-6 w-11/12 rounded bg-gray-200 animate-pulse" />
    <div className="h-5 w-2/5 rounded bg-gray-200 animate-pulse" />
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-11/12 rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-3/5 rounded bg-gray-200 animate-pulse" />
    </div>
  </div>
</div>
```

---

### 4.5 Header (Date & Navigation)

Page header showing current date and title.

#### Layout

```
┌────────────────────────────────────┐
│ ◀︎ 오늘의 브리핑 · 3월 24일 화요일  │
│ (Saturday = 토요일, etc.)          │
└────────────────────────────────────┘
```

#### Container

- **Width:** Full width
- **Tailwind:** `w-full`
- **Padding:** 16px horizontal, 12px vertical
- **Tailwind:** `px-4 py-3`
- **Background:** White
- **Tailwind:** `bg-white`
- **Border Bottom:** 1px solid gray
- **Tailwind:** `border-b border-gray-200`
- **Display:** Flex, center vertically
- **Tailwind:** `flex items-center gap-2`
- **Sticky:** Top, below status bar
- **Tailwind:** `sticky top-0 z-30`

#### Title Text

- **Text:** Bold, large
- **Tailwind:** `text-lg font-bold text-gray-900`
- **Content:** "오늘의 브리핑"

#### Date Text

- **Text:** Medium, secondary color
- **Tailwind:** `text-base font-medium text-gray-600`
- **Separator:** Middle dot (·)
- **Format:** "M월 D일 요일" (e.g., "3월 24일 화요일")
- **Days:** 월요일, 화요일, 수요일, 목요일, 금요일, 토요일, 일요일

#### Back Button (Optional)

- **Icon:** Chevron left or back arrow
- **Tailwind:** `p-2 hover:bg-gray-100 rounded-md transition-colors`
- **Visible:** Only on detail/expanded views

```jsx
// Header Component
<header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white">
  <div className="flex items-center gap-3 px-4 py-3">
    <h1 className="text-lg font-bold text-gray-900">오늘의 브리핑</h1>
    <span className="text-base font-medium text-gray-600">·</span>
    <span className="text-base font-medium text-gray-600">3월 24일 화요일</span>
  </div>
</header>
```

---

### 4.6 Landing Page (Desktop View)

Homepage wireframe showing signup flow.

#### Section 1: Hero

```
┌────────────────────────────────────┐
│                                    │
│  아침 5분, 경제 뉴스 한눈에 보기    │  ← Main headline
│                                    │
│  바쁜 아침, 핵심만 쏙쏙!            │  ← Subheading
│                                    │
│  ┌────────────────────────────────┐│
│  │  지금 시작하기                  ││  ← CTA button
│  └────────────────────────────────┘│
│                                    │
└────────────────────────────────────┘
```

**Styling:**
- **Background:** Indigo gradient
- **Tailwind:** `bg-gradient-to-br from-indigo-600 to-indigo-800`
- **Text Color:** White
- **Tailwind:** `text-white`
- **Padding:** 64px horizontal, 80px vertical
- **Tailwind:** `px-16 py-20`
- **Text Align:** Center
- **Tailwind:** `text-center`

**Title:**
- **Tailwind:** `text-5xl font-bold text-white mb-4`

**Subheading:**
- **Tailwind:** `text-xl font-medium text-indigo-100 mb-8`

**CTA Button:**
- **Tailwind:** `bg-white text-indigo-600 font-bold px-8 py-3 rounded-lg hover:bg-indigo-50 transition-colors`

#### Section 2: Preview (Sample Card)

```
┌────────────────────────────────────┐
│  서비스 미리보기                   │
│  ──────────────────────────────────│
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 1                            │  │  ← Card 1 (fully visible)
│  │ [FULL CARD VISIBLE]          │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 2                            │  │  ← Card 2 (blurred)
│  │ ════════════════════════════ │  │
│  │ [BLURRED CONTENT]            │  │
│  │                              │  │
│  │  전체 브리핑 보기              │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 3                            │  │  ← Card 3 (blurred)
│  │ ════════════════════════════ │  │
│  │ [BLURRED CONTENT]            │  │
│  │                              │  │
│  │  전체 브리핑 보기              │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

**Container:**
- **Tailwind:** `py-16 px-8 bg-gray-50`

**Section Title:**
- **Tailwind:** `text-3xl font-bold text-gray-900 mb-12 text-center`

**Card Stack:**
- **Max Width:** 480px, centered
- **Tailwind:** `max-w-md mx-auto space-y-4`

#### Section 3: Pricing

```
┌────────────────────────────────────┐
│  요금제                            │
│  ──────────────────────────────────│
│                                    │
│  카드 1: 무료 (매일)                │  ← Free tier
│  카드 2-3: 월 9,900원               │  ← Paid tier
│                                    │
│  ┌────────────────────────────────┐│
│  │  구독 시작하기                  ││  ← CTA
│  └────────────────────────────────┘│
│                                    │
└────────────────────────────────────┘
```

**Container:**
- **Tailwind:** `py-16 px-8 bg-white`

**Section Title:**
- **Tailwind:** `text-3xl font-bold text-gray-900 mb-12 text-center`

**Pricing Box:**
- **Tailwind:** `bg-gray-50 rounded-lg p-8 max-w-md mx-auto space-y-4`

**Feature List:**
- **Tailwind:** `space-y-2 text-base text-gray-600`

**CTA Button:**
- **Tailwind:** `w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center`

#### Section 4: Footer CTA

```
┌────────────────────────────────────┐
│                                    │
│  아직도 뉴스 정독하고 계신가요?     │
│  시간을 아끼고 트렌드를 잡으세요!    │
│                                    │
│  ┌────────────────────────────────┐│
│  │  지금 시작하기                  ││
│  └────────────────────────────────┘│
│                                    │
│  Copyright © 2024 Morning Briefing │
│                                    │
└────────────────────────────────────┘
```

**Container:**
- **Tailwind:** `py-16 px-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white text-center`

**Title:**
- **Tailwind:** `text-2xl font-bold mb-2`

**Subtitle:**
- **Tailwind:** `text-lg font-medium text-indigo-100 mb-6`

**CTA Button:**
- **Tailwind:** `bg-white text-indigo-600 font-bold px-8 py-3 rounded-lg hover:bg-indigo-50 transition-colors inline-block`

---

## 5. State-Specific UI

### 5.1 Loading States

#### Skeleton Cards
- Use `CardSkeleton` component
- Show 3 placeholder cards
- Pulse animation on all elements
- Tailwind: `animate-pulse`

#### Loading Indicator
- Optional: Spinner in header
- Color: Primary indigo
- Tailwind: `text-indigo-600`

### 5.2 Error States

#### Error Message Card

```
┌──────────────────────────────┐
│         ⚠️                   │  ← Warning icon
│   오류가 발생했습니다         │
│   데이터를 불러올 수         │
│   없습니다. 다시 시도해       │
│   주세요.                    │
│                              │
│  ┌────────────────────────┐  │
│  │  다시 시도              │  │  ← Retry button
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Container:**
- **Tailwind:** `border border-red-200 bg-red-50 rounded-lg p-6 text-center max-w-md mx-auto`

**Icon:**
- **Tailwind:** `text-4xl mb-3`

**Title:**
- **Tailwind:** `text-lg font-bold text-gray-900 mb-2`

**Message:**
- **Tailwind:** `text-base text-gray-600 mb-6`

**Retry Button:**
- **Tailwind:** `bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-md transition-colors`

### 5.3 Yesterday's Briefing Badge

#### Badge Style

- **Shape:** Pill
- **Background:** Lighter color
- **Tailwind:** `bg-gray-100`
- **Text:** Small, semibold
- **Tailwind:** `text-xs font-semibold text-gray-600`
- **Padding:** 4px horizontal, 2px vertical
- **Tailwind:** `px-2 py-0.5`
- **Position:** In metadata row (card bottom)

```jsx
<span className="inline-block px-2 py-0.5 bg-gray-100 text-xs font-semibold text-gray-600 rounded">
  어제의 브리핑
</span>
```

### 5.4 Offline Banner

#### Top Banner

```
┌────────────────────────────────────┐
│  📡 오프라인 상태입니다             │  ← Warning icon
│  인터넷 연결을 확인해주세요         │
└────────────────────────────────────┘
```

**Container:**
- **Position:** Top, fixed
- **Tailwind:** `fixed top-0 left-0 right-0 z-50`
- **Background:** Yellow/warning
- **Tailwind:** `bg-yellow-50 border-b border-yellow-200`
- **Padding:** 12px
- **Tailwind:** `px-4 py-3`
- **Display:** Flex, center
- **Tailwind:** `flex items-center justify-center gap-2`

**Text:**
- **Tailwind:** `text-sm font-medium text-yellow-800`

### 5.5 Category Loading ("준비 중")

When a category has no data yet:

#### Skeleton Variant

Show skeleton cards ONLY for that category tab.

```
┌────────────────────────────────────┐
│ 경제/시사  |  투자                 │  ← Tabs (투자 selected)
├────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │  ← Skeleton 1
│ ▓▓▓▓▓▓▓▓▓▓▓▓                       │
│                                    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │  ← Skeleton 2
│ ▓▓▓▓▓▓▓▓▓▓▓▓                       │
│                                    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │  ← Skeleton 3
│ ▓▓▓▓▓▓▓▓▓▓▓▓                       │
└────────────────────────────────────┘
```

**Implementation:**
- Show `CardSkeleton` for each expected card
- Tailwind: `animate-pulse`

---

## 6. Full-Page Wireframes

### 6.1 Home Screen (Mobile 375px)

```
┌─────────────────────────────────────┐
│ 오늘의 브리핑 · 3월 24일 화요일     │  ← Header (sticky, z-30)
├─────────────────────────────────────┤
│ 경제/시사  |  투자                   │  ← Category Tabs (sticky, z-20)
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────────────────────┐ │
│  │ 1                              │ │  ← Card 1 (Free)
│  │ ┌──────────────────────────────┤ │
│  │ │ 삼성전자 분기 실적 사상       │ │
│  │ │ 최대 호실적                  │ │
│  │ ├──────────────────────────────┤ │
│  │ │ 영향분석                     │ │
│  │ │ 삼성전자가 2024년 1분기...    │ │
│  │ │ 어제의 브리핑 · 3월 23일     │ │
│  │ └──────────────────────────────┘ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ 2                              │ │  ← Card 2 (Paywall)
│  │ ┌──────────────────────────────┤ │
│  │ │ 금리인상 경제에 미치는 영향   │ │  ← Title visible
│  │ │══════════════════════════════│ │  ← Blurred below
│  │ │ [BLURRED]                    │ │
│  │ │                              │ │
│  │ │ 전체 브리핑 보기              │ │
│  │ └──────────────────────────────┘ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ 3                              │ │  ← Card 3 (Paywall)
│  │ ┌──────────────────────────────┤ │
│  │ │ 비트코인 최고가 경신           │ │  ← Title visible
│  │ │══════════════════════════════│ │  ← Blurred below
│  │ │ [BLURRED]                    │ │
│  │ │                              │ │
│  │ │ 전체 브리핑 보기              │ │
│  │ └──────────────────────────────┘ │
│  └────────────────────────────────┘ │
│                                     │
│                                     │  ← Bottom safe area
└─────────────────────────────────────┘
```

### 6.2 Card Expanded View (Modal/Detail Page)

```
┌─────────────────────────────────────┐
│ ◀ 삼성전자 실적                      │  ← Header with back button
├─────────────────────────────────────┤
│                                     │
│ ┌────────────────────────────────┐  │
│ │ 1                              │  │
│ │ ┌──────────────────────────────┤  │
│ │ │ 삼성전자 분기 실적 사상       │  │
│ │ │ 최대 호실적                  │  │
│ │ ├──────────────────────────────┤  │
│ │ │ 영향분석                     │  │
│ │ │                              │  │
│ │ │ 삼성전자가 2024년 1분기       │  │
│ │ │ 영업이익 7조 3천억원으로      │  │
│ │ │ 사상 최고 실적을 기록했다.    │  │
│ │ │ 이는 전년동기대비 47% 증가한  │  │  ← Full content
│ │ │ 수치다.                       │  │
│ │ │                              │  │
│ │ │ [더 많은 콘텐츠...]           │  │
│ │ │                              │  │
│ │ │ 출처: 삼성전자 IR | 조회      │  │  ← Metadata
│ │ │ 3월 24일 09:30               │  │
│ │ └──────────────────────────────┘  │
│ └────────────────────────────────┘  │
│                                     │
│ [Previous Card]  |  [Next Card]     │  ← Navigation buttons
│                                     │
└─────────────────────────────────────┘
```

### 6.3 Landing Page (Desktop 1200px+)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│         ┌─────────────────────────────────────────────┐        │
│         │ Hero Section (bg-indigo gradient)          │        │
│         │                                             │        │
│         │  아침 5분, 경제 뉴스 한눈에 보기              │        │
│         │                                             │        │
│         │  바쁜 아침, 핵심만 쏙쏙!                     │        │
│         │                                             │        │
│         │  ┌─────────────────────────────────────┐   │        │
│         │  │   지금 시작하기 (CTA)               │   │        │
│         │  └─────────────────────────────────────┘   │        │
│         │                                             │        │
│         └─────────────────────────────────────────────┘        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Preview Section                                        │   │
│  │                                                        │   │
│  │  서비스 미리보기                                       │   │
│  │  ─────────────────────────────────────────────────────│   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ Card 1 (visible)                                 │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ Card 2 (blurred paywall)                         │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ Card 3 (blurred paywall)                         │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Pricing Section (bg-white)                             │   │
│  │                                                        │   │
│  │  요금제                                                │   │
│  │  ─────────────────────────────────────────────────────│   │
│  │                                                        │   │
│  │  카드 1: 무료 (매일)                                   │   │
│  │  카드 2-3: 월 9,900원 구독                             │   │
│  │                                                        │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │     구독 시작하기 (CTA)                         │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│         ┌─────────────────────────────────────────────┐        │
│         │ Footer CTA (bg-indigo gradient)           │        │
│         │                                             │        │
│         │  아직도 뉴스 정독하고 계신가요?             │        │
│         │  시간을 아끼고 트렌드를 잡으세요!           │        │
│         │                                             │        │
│         │  ┌─────────────────────────────────────┐   │        │
│         │  │   지금 시작하기 (CTA)               │   │        │
│         │  └─────────────────────────────────────┘   │        │
│         │                                             │        │
│         │ Copyright © 2024 Morning Briefing         │        │
│         │                                             │        │
│         └─────────────────────────────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Notes for Web Dev

### 7.1 Tailwind Configuration

Add custom values to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'sans': [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Noto Sans KR',
          'sans-serif'
        ],
      },
      colors: {
        // Category colors
        'category': {
          'economy': '#14B8A6', // teal-500
          'investment': '#F59E0B', // amber-500
          'market': '#10B981', // emerald-500
          'tech': '#A855F7', // purple-500
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      backdropBlur: {
        'sm': '4px',
        'md': '12px',
      },
    },
  },
}
```

### 7.2 CSS Custom Properties (for dynamic colors)

```css
:root {
  --color-primary: #4F46E5;
  --color-primary-light: #EEF2FF;
  --color-primary-dark: #312E81;

  --color-category-economy: #14B8A6;
  --color-category-investment: #F59E0B;
  --color-category-market: #10B981;
  --color-category-tech: #A855F7;

  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}
```

### 7.3 Key Component Implementation Patterns

**Pattern 1: Category-based Badge Color**
```jsx
const categoryColors = {
  '경제': 'bg-teal-500',
  '투자': 'bg-amber-500',
  '시장동향': 'bg-emerald-500',
  '기술': 'bg-purple-500',
};

<div className={`${categoryColors[card.category]}`}>
  {card.number}
</div>
```

**Pattern 2: Paywall Overlay**
```jsx
{isPaid === false && (
  <div className="absolute inset-0 z-40 rounded-lg bg-white/95 backdrop-blur-md flex items-center justify-center">
    <button className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-md">
      전체 브리핑 보기
    </button>
  </div>
)}
```

**Pattern 3: Responsive Card**
```jsx
<div className="w-full md:max-w-md mx-auto">
  {/* Card content */}
</div>
```

### 7.4 Mobile Breakpoints

Use Tailwind's default breakpoints:

- **Mobile:** 0-640px (default, no prefix)
- **Tablet:** 641px-1024px (use `sm:`, `md:` prefix)
- **Desktop:** 1025px+ (use `lg:`, `xl:` prefix)

Example: Card full-width on mobile, 480px max on larger screens
```jsx
<div className="w-full md:max-w-md">
```

### 7.5 Safe Area Considerations

For iOS devices with notch/home indicator:

```jsx
<div className="pt-safe">
  {/* Content */}
</div>
```

Use Tailwind's safe area utilities if available, or add custom CSS:

```css
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

### 7.6 Performance Notes

- Use `line-clamp-*` utilities for text truncation
- Lazy-load card content in scrollable areas
- Implement virtual scrolling for large card lists
- Use CSS `will-change` for smooth animations (sparingly)
- Optimize images to 600px width for cards

### 7.7 Accessibility

- All buttons must have `aria-label` or visible text
- Color contrast ratios ≥ 4.5:1 for text on backgrounds
- Interactive elements minimum 44x44px touch target
- Use semantic HTML (`<button>`, `<nav>`, `<header>`)
- Include alt text for any decorative icons
- Ensure keyboard navigation works on tabs and buttons
- Test with screen readers (NVDA, JAWS)

### 7.8 Korean Language Considerations

- Use `word-break: break-word` or `overflow-wrap: break-word` for long words
- Noto Sans KR handles most Korean characters well
- Test with longer Korean text (can be 30-40% longer than English)
- Number badges can display hangul characters (자, 경, etc.) if needed
- Date format: "M월 D일 요일" (3월 24일 화요일)
- Day names: 월요일, 화요일, 수요일, 목요일, 금요일, 토요일, 일요일

---

## 8. Design Tokens Summary (Quick Reference)

| Token | Value | Usage |
|-------|-------|-------|
| **Primary Color** | Indigo-600 (#4F46E5) | CTAs, active states |
| **Primary Light** | Indigo-50 (#EEF2FF) | Backgrounds |
| **Card Bg** | White | Card backgrounds |
| **Card Border** | Gray-200 | Card edges |
| **Text Primary** | Gray-900 | Headings, main text |
| **Text Secondary** | Gray-600 | Body text |
| **Text Tertiary** | Gray-500 | Captions |
| **Card Padding** | 20px vertical, 16px horizontal | py-5 px-4 |
| **Card Gap** | 12px | gap-3 |
| **Border Radius** | 12px | rounded-lg |
| **Shadow** | Subtle | shadow-sm |
| **Font Primary** | System + Noto Sans KR | All text |
| **Title Size** | 20px bold | Card titles |
| **Body Size** | 16px normal | Main content |
| **Caption Size** | 12px medium | Metadata |
| **Badge Size** | 48px circle | Category numbers |
| **Blur** | 12px | Paywall overlay |
| **Mobile Width** | Full (minus 16px margin) | Card width |
| **Desktop Max** | 480px | max-w-md |
| **Tab Gap** | 24px | gap-6 |
| **Active Tab Border** | 3px indigo-600 | border-b-4 |

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-24 | Initial design system documentation |

---

**For questions or updates, contact the UX/UI Design team.**
