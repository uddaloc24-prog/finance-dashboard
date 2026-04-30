# Finance Project — Full Context Dump

> A complete walkthrough of what has been built, how it works, and the decisions behind it.
> Feed this file to Claude (or any other LLM) to give them full working context of the project.

---

## 1. What This Project Is

**Indian Retirement Planner** — a browser-based financial planning tool aimed at Indian retirees and near-retirees (the "FIRE / SWP" audience). It implements HDFC's **4-Bucket Systematic Withdrawal Plan (SWP) strategy** with live market data, AI-assisted portfolio optimization, year-by-year simulations, and PDF export.

- **Live URL:** https://finance-liart-nine.vercel.app
- **Repo:** `c:\Users\uddal\OneDrive\Desktop\finance`
- **Branch:** `main`
- **Audience:** Public, Indian retail investors (ages 45-75), money in INR (₹), retirement in India.

The long-term ambition is "Indian Boldin" — a full Boldin-style retirement platform with Demographics, Income Streams, Asset Basket, Tax Optimizer, Real Estate Optimizer, Withdrawal Strategy, Stress Tests, and AI advisor.

**Phase 1 is shipped.** Phases 2–5 are planned and specced but not yet built.

---

## 2. Tech Stack (current)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 18 + Vite 6 | Fast dev, pure SPA, no Next.js overhead |
| Language | TypeScript 5.6 (strict) | Type safety for financial math |
| Styling | Tailwind CSS 3.4 | Utility-first, mobile-first |
| Charts | Recharts 2.13 | Lazy-loaded via manualChunks |
| PDF | jsPDF + html2canvas | Lazy dynamic-imported only on click |
| State | `useState` + `localStorage` | No Redux, no Zustand — single-user, local-only |
| Backend | **None yet** | Everything lives in `localStorage` |
| Auth | **None yet** | Single-user app |
| Hosting | Vercel | Static SPA deploy |
| AI | Groq API (user-provided key) | BYO key, no server relay |

**No backend. No database. No auth. Everything is client-side** and persisted in `localStorage`. The plan calls for adding Supabase later for multi-user + brokerage API integration.

---

## 3. The Core Financial Model — 4-Bucket SWP

This is the beating heart of the app. Every screen, chart, slider, and AI suggestion revolves around these four buckets.

### The Buckets

| Bucket | Horizon | Default % | Return | Purpose | Instruments |
|--------|---------|-----------|--------|---------|-------------|
| **B1 — Emergency** | 0–1 yr | 10% | 7.0% | Pays monthly withdrawals | Liquid MF, Money Market, Overnight, Sweep |
| **B2 — Short Term** | 1–5 yrs | 20% | 8.0% | Safety buffer | SCSS (8.2%), Senior FD, Short Duration MF, Corp Bond MF |
| **B3 — Growth Engine** | 5–10 yrs | 30% | 9.5% | Refills B1 & B2 | BAF, Aggressive Hybrid, Multi-Asset, Balanced Advantage |
| **B4 — Legacy Equity** | 10+ yrs | 40% | 12.0% | Compounds; never drained | Flexi Cap MF, Large Cap, Nifty 50 Index, Gold ETF |

### The Cascade Model (Interest-Only SWP)

This is the key algorithm that differentiates the app. **Principals of B3 and B4 are LOCKED — they never decrease.** Only interest cascades down.

Each simulated year:
1. Every bucket earns interest on its principal.
2. **B4 interest → B3** (equity gains flow down)
3. **B3 interest + received → B2** (hybrid gains + equity gains flow down)
4. **B2 interest + received → B1** (everything pools into B1)
5. **B1 pays the annual withdrawal** (inflation-adjusted)
6. **Emergency fallback:** if B1 pool < 6 months of expenses, break into B2 principal (SCSS/FD — last resort, incurs penalty)

Result: B3/B4 principals stay intact across a 25-year horizon. The strategy preserves "legacy corpus" while funding retirement from cascading interest.

**Implementation:** `src/lib/calculations.ts` — `simulateSWP()` runs this for `SWP_YEARS = 25` (display) and `PRESERVATION_YEARS = 20` (binary-search for max sustainable withdrawal).

### Max Sustainable Withdrawal

`computeMaxSustainableWithdrawal()` does a 60-iteration binary search between ₹0 and `corpus/60` monthly to find the **highest monthly withdrawal where corpus stays ≥ initial corpus for all 20 years**. Rounded down to nearest ₹500.

---

## 4. File Structure

```
finance/
├── index.html                     — SEO-optimized landing shell (meta, OG, JSON-LD, noscript)
├── public/
│   ├── robots.txt                 — allows all crawlers
│   ├── sitemap.xml                — single URL entry
│   ├── favicon.svg / favicon-32.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png / icon-512.png — PWA icons
│   ├── manifest.webmanifest       — PWA manifest
│   └── og-image.png               — social share preview
├── src/
│   ├── App.tsx                    — root, holds profile/buckets/returns state
│   ├── main.tsx                   — React root
│   ├── types/index.ts             — all TypeScript interfaces
│   ├── constants/index.ts         — defaults, bucket config, city multipliers, tabs
│   ├── lib/
│   │   ├── calculations.ts        — SWP cascade, preservation, expense projection, tax
│   │   ├── storage.ts             — localStorage wrapper (profile/buckets/returns/market/ai)
│   │   ├── market.ts              — fetch NIFTY, SENSEX, gold, FD rates, MF NAVs
│   │   └── pdf.ts                 — PDF export (jsPDF + html2canvas)
│   ├── hooks/
│   │   ├── useStorage.ts
│   │   └── useMarketData.ts       — polls market.ts on refreshInterval
│   └── components/
│       ├── Dashboard.tsx          — top-level shell, tab state, lazy loading
│       ├── TabNav.tsx             — desktop pills + mobile bottom bar (ARIA tablist)
│       ├── ProfileSettings.tsx    — corpus, withdrawal, SIP, frequency
│       ├── DemographicsForm.tsx   — age, retirement age, life expectancy, city, spouse
│       ├── ExpenseEditor.tsx      — 4 expense categories + dual inflation
│       ├── Sliders.tsx            — return assumptions, risk, tax bracket
│       ├── BucketCard.tsx         — per-bucket display (% allocation, runway)
│       ├── RefillAlert.tsx        — "B1 low, refill from B2" warning
│       ├── CascadeExplainer.tsx   — visual flow diagram (B4→B3→B2→B1)
│       ├── YearSimulator.tsx      — year-by-year playback with auto-play
│       ├── SWPSimulator.tsx       — 25-yr line chart + table
│       ├── CorpusPreservation.tsx — max sustainable withdrawal widget
│       ├── AIPortfolioOptimizer.tsx — Groq LLM suggests fund picks
│       ├── AIPanel.tsx            — legacy AI panel (superseded by AIPortfolioOptimizer)
│       ├── MarketPanel.tsx        — NIFTY/SENSEX/gold/FD live ticker
│       ├── TaxOverlay.tsx         — post-tax return table by instrument
│       ├── RiskProfiler.tsx       — risk questionnaire (built, not yet wired)
│       ├── Onboarding.tsx         — legacy first-run flow (no longer rendered)
│       └── ui/
│           ├── Card.tsx
│           ├── Badge.tsx
│           └── Button.tsx
└── vite.config.ts                 — manualChunks: recharts, pdf
```

---

## 5. Data Model — All TypeScript Types

Defined in [src/types/index.ts](src/types/index.ts).

```ts
type PaymentFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
type CityTier = 'metro' | 'tier1' | 'tier2' | 'rural'

interface Demographics {
  currentAge: number          // default 55
  retirementAge: number       // default 60
  lifeExpectancy: number      // default 90
  spouseAge?: number
  spouseLifeExpectancy?: number
  city: CityTier
}

interface ExpenseProfile {
  essential: number           // monthly INR (default 30k)
  lifestyle: number           // default 15k
  healthcare: number          // default 10k
  education: number           // default 5k
  generalInflation: number    // percent default 6
  healthcareInflation: number // percent default 10
  educationInflation: number  // percent default 12
}

interface UserProfile {
  corpus: number                                     // total investable INR
  monthlyWithdrawal: number                          // always stored as monthly
  withdrawalFrequency: PaymentFrequency
  withdrawalAmount: number                           // raw amount at chosen frequency
  sipAmount: number                                  // passive income at chosen freq
  sipFrequency: PaymentFrequency
  inflationRate: number                              // percent e.g. 6.5
  riskAppetite: 1 | 2 | 3 | 4 | 5
  taxBracket: 0 | 5 | 20 | 30                        // percent
  refreshInterval: 1 | 6                             // hours, for market polling
  groqApiKey: string                                 // BYO key
  bucketAllocation?: { b1; b2; b3; b4 }              // fractions summing to 1
  demographics?: Demographics
  expenses?: ExpenseProfile
}

interface ReturnAssumptions { b1; b2; b3; b4 }       // percent e.g. { 7, 8, 9.5, 12 }
interface BucketState { b1; b2; b3; b4 }             // INR values in each

interface MFNav {
  schemeCode; schemeName; nav; date
  oneYearReturn: number | null
  bucket: 'b1' | 'b2' | 'b3' | 'b4'
}

interface MarketData {
  nifty; niftChange; sensex; sensexChange
  gold                                                // INR per 10g
  scssRate                                            // default 8.2 percent
  fdRates: { SBI; HDFC; ICICI }
  mfNavs: MFNav[]
  lastRefreshed: string | null                        // ISO timestamp, e.g. "2026-04-17T09:30:00.000Z"
}

interface SWPYearRow {
  year; annualWithdrawal
  b1; b2; b3; b4                                     // end-of-year balances
  b4Harvested                                        // gains B4 -> B3
  b1GrowthEarned; b2GrowthEarned; b3GrowthEarned
  b1RefillFromB2; b2RefillFromB3; b3HarvestFromB4
  b4EmergencyToB3                                    // legacy field, always 0
  b2EmergencyToB1                                    // last-resort SCSS break
  totalCorpus; isLegacyYear
  corpusBelowInitial: boolean
  totalReturnsEarned
}

interface AISuggestion { fund; bucket; nav; oneYearReturn; suggestedAllocation; rationale }

interface AppState { profile; buckets; returnAssumptions; marketData; aiSuggestions; aiLastFetched }
```

---

## 6. The UI — Tab-Based, 5 Tabs

Dashboard is tab-driven (no router). State lives in `useState<TabId>('plan')` inside `Dashboard.tsx`. Each tab only renders its content when active — heavy components (Recharts, AI) are `React.lazy()` imported.

### Tab 1: Plan (default)
- **ProfileSettings** — corpus, monthly/quarterly/yearly withdrawal + SIP editor
- **DemographicsForm** — age, retirement age, life expectancy sliders; city tier pills; collapsible spouse section
- **ExpenseEditor** — 4 color-coded expense cards (essential/lifestyle/healthcare/education) with proportion bars, dual-inflation projections (10yr/20yr/annual preview)

### Tab 2: Assets
- **RefillAlert** — warns if B1 runway < 12 months, one-click refill from B2
- **4 BucketCards** — each shows INR value, % allocation, assumed return; B1 also shows runway months
- **Sliders** — adjust return assumptions, allocation percentages, risk/tax/refresh settings

### Tab 3: Tax
- **Placeholder** — "coming in Phase 3". `computeTaxRows()` logic exists in `calculations.ts` but isn't surfaced yet.

### Tab 4: Simulate
- **CorpusPreservation** — shows max sustainable monthly withdrawal (binary-search result)
- **YearSimulator** — year-by-year playback with auto-play, shows cascade in action
- **SWPSimulator** — 25-year Recharts line chart + detailed table

### Tab 5: AI
- **AIPortfolioOptimizer** — calls Groq API with user's profile + current market data, returns fund picks per bucket with rationale

### Global UI Elements
- **Header** — app title, Export PDF button, Reset button (sticky top)
- **Stats row** — Total Corpus / Withdrawal / (SIP if >0) / B1 Runway in colored cards
- **Mobile bottom bar** — 5 tabs, 56px touch targets, fixed to bottom with `pb-20` body padding

---

## 7. Key Calculations (src/lib/calculations.ts)

```ts
allocateBuckets(corpus, allocation) -> BucketState
totalCorpus(buckets) -> number
b1RunwayMonths(b1Value, monthlyWithdrawal) -> number
shouldRefillB1(runway, threshold=12) -> boolean
refillB1Amount(b1Value, monthlyWithdrawal, targetMonths=24) -> number
shouldRefillB2Emergency(b2Value, monthlyWithdrawal) -> boolean
harvestB4ToB3(buckets, b4ReturnPct) -> BucketState       // immutable
transferBucket(buckets, from, to, amount) -> BucketState // immutable

simulateSWP({ buckets, monthlyWithdrawal, inflationRate, returnAssumptions, initialCorpus }) -> SWPYearRow[]
computeMaxSustainableWithdrawal(corpus, returns, inflation, allocation) -> number

retirementHorizonYears(demo) -> number        // lifeExpectancy - currentAge
yearsToRetirement(demo) -> number             // retirementAge - currentAge
isRetired(demo) -> boolean                    // currentAge >= retirementAge
projectExpensesAtYear(expenses, years) -> number          // dual-inflation compounding
projectAnnualExpenses(expenses, horizonYears) -> Array<{year, monthly, annual}>

computeTaxRows(returns, taxBracket, scssRate, fdRates, annualB4Gains) -> TaxRow[]
```

---

## 8. Persistence — localStorage

Nothing touches a backend. Everything lives in `localStorage` via `src/lib/storage.ts`:
- `profile` — full UserProfile JSON
- `buckets` — BucketState JSON
- `returnAssumptions` — ReturnAssumptions JSON
- `marketData` — cached MarketData with TTL = refreshInterval hours
- `aiSuggestions` + `aiLastFetched` — last AI run cache
- `clearAll()` — factory reset (triggered by header Reset button)

Auto-migration: older profiles without `withdrawalFrequency`/`sipAmount` get defaulted on load.

---

## 9. Market Data (src/lib/market.ts)

Pulls live numbers from **client-side fetches** (no API keys for this path):
- NIFTY 50 + SENSEX (via public endpoints)
- Gold per 10g (INR)
- FD rates: SBI, HDFC, ICICI (defaults if fetch fails)
- MF NAVs from **AMFI public JSON** (mfapi.in) for the scheme codes in `MF_SCHEMES`

`useMarketData(refreshInterval)` polls every 1 or 6 hours based on user preference. Results cached in localStorage.

### MF Schemes Tracked

| Bucket | Fund | Scheme Code |
|--------|------|-------------|
| B1 | SBI Liquid / HDFC Liquid / Nippon India Liquid | 125497 / 119598 / 118701 |
| B2 | HDFC Short Duration / ICICI Corp Bond / SBI Medium Duration | 118989 / 120586 / 125354 |
| B3 | HDFC BAF / ICICI BAF / Mirae Hybrid Equity | (same codes reused — TODO: replace) |
| B4 | Parag Parikh Flexi Cap / Mirae Large Cap / Nippon Gold BeES | 122639 / 118834 / 120503 |

---

## 10. AI Integration

`AIPortfolioOptimizer.tsx` — user pastes their **Groq API key** (stored in profile), the app sends a structured prompt including: current profile, current buckets, current return assumptions, and live MF NAVs. LLM returns an array of `AISuggestion` objects `{ fund, bucket, nav, oneYearReturn, suggestedAllocation, rationale }`.

No server relay — the fetch call goes directly from browser to Groq. Key never leaves the user's machine.

---

## 11. PDF Export

`src/lib/pdf.ts` exports `exportPDF(profile, buckets, returnAssumptions, rows)`.

Dynamically imported on button click (so jsPDF + html2canvas don't bloat the main bundle). Renders the simulation table + stats card as a multi-page PDF.

---

## 12. SEO & Performance

Site scored 86/100 on SEO audit after fixes. Techniques applied:

### SEO (index.html)
- `<html lang="en-IN">`
- Title: "Indian Retirement Planner — 4-Bucket SWP Strategy Calculator"
- 155-char meta description
- Full OG + Twitter Card tags
- Canonical URL
- JSON-LD **WebApplication** schema with featureList
- JSON-LD **FAQPage** schema (2 Q&As)
- Theme color, apple-mobile-web-app meta
- PWA manifest link
- `<noscript>` fallback with keyword-rich copy (since app is CSR SPA)
- `public/robots.txt` + `public/sitemap.xml`

### Bundle splitting (vite.config.ts)
- `manualChunks` splits **recharts** and **jspdf+html2canvas** into separate chunks
- `React.lazy()` for 4 heavy components (CorpusPreservation, SWPSimulator, YearSimulator, AIPortfolioOptimizer) — only load when their tab opens
- Dynamic `import()` for PDF on click

**Result:** Main bundle **62.57 KB** (down from 659 KB — 90% reduction). Recharts chunk 547 KB, PDF chunk 562 KB — both lazy.

### Accessibility
- Full ARIA tablist pattern (role, aria-selected, aria-controls, aria-labelledby)
- Semantic `<h1>` for app title, `<h2>` for cards
- `aria-hidden="true"` on emoji icons
- `aria-label` on unlabeled controls (sliders, risk)
- Collapsible `<details>` for spouse + inflation assumptions
- 56px touch targets on mobile bottom nav

---

## 13. Design Philosophy

The user asked for **"Apple's philosophy"** — effortless UI. What that translated to:
- Progressive disclosure: advanced settings live inside `<details>` elements, collapsed by default
- Pill-style selectors for categorical choices (city tier, frequency)
- Slider + number-input combo for every numeric field (slide or type)
- Color-coded categories (blue/green/red/amber) consistent across buckets and expense categories
- Single INR formatting helper: `1.00 Cr` / `1.5 L` / `60,000`
- Mobile-first: everything works on a 375px viewport before it looks pretty on desktop
- No modals for settings — inline editing with autosave

---

## 14. What's NOT Built (Pending Phases)

The user approved a 5-phase plan. Phase 1 is shipped; Phases 2–5 are specced but not built.

### Phase 2: Income Streams + Asset Basket
- Income streams editor (pension, rental, SIP income, part-time work)
- Asset basket editor (EPF, PPF, NPS, real estate, gold, FDs as discrete line items)
- Net worth summary

### Phase 3: Tax Optimizer
- Old vs New regime comparison
- Full deduction logic (80C, 80D, 80CCD, HRA, home loan, etc.)
- Post-tax return table per instrument (logic already exists in `computeTaxRows`)

### Phase 4: Real Estate Optimizer + Withdrawal Strategy
- Reverse mortgage calculator
- Real estate liquidation scenarios
- Withdrawal order optimization (which bucket first)

### Phase 5: Stress Tests + AI Enhancement
- Monte Carlo simulation
- Black swan scenarios (2008, 2020 crashes)
- Inflation spike tests
- Enhanced AI: personalized advice, tax loss harvesting suggestions

### Other TODO
- No backend -> no multi-user, no sync across devices
- No brokerage API integration (Plaid / Zerodha / Groww) yet
- No auth
- RiskProfiler component built but not wired into onboarding
- Onboarding.tsx exists but is orphaned (App.tsx bypasses it)
- Tax tab is a placeholder

---

## 15. Known Decisions & Gotchas

- **B3 and B4 principals are LOCKED.** This is the whole point of the cascade model. Never drain them in any new feature without explicit override.
- **B2 is only drained in emergency** (SCSS/FD early-withdrawal penalty). Guard against casual B2 -> B1 flows.
- **Frequency fields are in the profile but the MODEL works in monthly.** When users set a yearly withdrawal, we store `withdrawalAmount` at the user's frequency AND compute `monthlyWithdrawal = withdrawalAmount / multiplier`. All simulation math uses `monthlyWithdrawal`.
- **Dual inflation** — essential/lifestyle compound at `generalInflation` (6%); healthcare at `healthcareInflation` (10%); education at `educationInflation` (12%). Projections use three separate `Math.pow()` calls.
- **City cost multiplier** exists (`CITY_COST_MULTIPLIER`: metro 1.0 / tier1 0.85 / tier2 0.70 / rural 0.55) but is not yet wired into the expense projection. TODO: apply to final display.
- **localStorage can go stale across schema changes.** Migration logic lives in `loadProfile()` in App.tsx — extend it when adding new required fields.
- **The AI key is user-supplied** (Groq). Never hardcode.
- **Recharts and PDF are both 500KB+**. Keep them lazy. Don't import at top level.
- **Tailwind purge works off className strings only.** Dynamic class names (`` `bg-${color}-500` ``) get purged — use full literal strings.
- **Mobile bottom nav is 56px + safe-area padding.** The main content has `pb-20 md:pb-0` to clear it.

---

## 16. Commands

```bash
npm run dev       # vite dev server (default http://localhost:5173)
npm run build     # tsc -b && vite build — outputs to dist/
npm run preview   # serve dist/ locally
npx vercel --prod # deploy to Vercel production
```

No test suite yet. No CI. No linter config beyond tsc strict.

---

## 17. Recent Commit History (most recent first)

1. `9ddcc82` — **feat: cascade explainer** — visual flow diagram with plain-English why-it-works explanations
2. `9ec4ef0` — **feat: 4-bucket strategy (HDFC model)** — B1 emergency, B2 short debt, B3 hybrid/BAF, B4 equity
3. `4566f0b` — **fix: B3 compounds freely, profits only flow to B2 when B2 needs replenishment**
4. `0918de1` — **feat: year-by-year bucket flow simulator with auto-play**
5. `2cdac9c` — **fix: profit-harvest bucket logic + slider text input**

Uncommitted changes (as of 2026-04-17): Phase 1 tab nav, Demographics, Expenses, SEO overhaul, lazy loading, public/ assets. Not yet committed.

---

## 18. How to Pick Up Where We Left Off

1. Read `CLAUDE.md` and this file.
2. Check `git status` — Phase 1 work is uncommitted.
3. If continuing Phase 2: build `IncomeStreamsEditor` + `AssetBasketEditor` and add to the Plan tab.
4. If building a new tool entirely: ask the user which tool first (see plan in `CLAUDE.md`).
5. Keep all new components under 400 lines, lazy-load anything with Recharts, keep mobile-first.
6. Never drain B3/B4 principal in any simulation change.
7. Test in a 375px viewport before shipping.

---

*This context file is maintained by Claude. Regenerate after major architectural changes.*
