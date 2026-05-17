# Retirement Planner — Project Context

> Source of truth for Claude. Read at the start of every session.

## What this app is

**Indian Retirement Planner — 4-Bucket SWP Strategy Calculator.** Single-page web app that walks the user through a 7-section plan, runs a 4-bucket cascade simulation, applies Indian tax/inflation rules, and produces a verdict (Achievable / Close / Not achievable) plus a 25-year projection.

- **Live (prod):** https://finance-liart-nine.vercel.app
- **Live (prototype):** https://finance-prototype-roan.vercel.app (sibling repo at `D:\claude\finance-prototype`)
- **Vercel project:** `finance` (org `team_Mp7IwyB4DakerFT1mfrb1zxs`)
- **Audience:** Indian retirees / pre-retirees. Single-user, client-side only (no backend, no auth, localStorage persistence).

## Tech stack

- **Build:** Vite 6 + TypeScript 5.6 + React 18
- **Styling:** Tailwind 3 + PostCSS
- **Charts:** recharts
- **Export:** jspdf + html2canvas, docx, pptxgenjs, xlsx — multi-format (PDF / DOCX / PPTX / MD / CSV)
- **Upload parsing:** pdfjs-dist, mammoth, xlsx (CAS / portfolio statements / Excel)
- **PWA:** vite-plugin-pwa + workbox-window
- **AI:** Groq client (`src/lib/aiClient.ts`), user supplies their own API key in Profile; no server-side AI
- **Persistence:** `localStorage` via `src/lib/storage.ts` (no DB, no server)

## App shape — V1 (production) vs V2 (chat-first, flag-gated)

`src/App.tsx` switches between two top-level shells:
- **V1 (default):** `Dashboard` — 11-tab UI. This is what's at finance-liart-nine.
- **V2:** `Shell` — chat-first interview prototype. Gated behind `?v2=1`, `/v2` path, or `VITE_V2_ENABLED=true`.

### V1 tabs (`src/constants/index.ts` → `TAB_ITEMS`)

1. 🙏 **Welcome** — Indian namaskar hero, quote collage, 36-item readiness checklist. Auto-launches first time, weekly re-show via `rp_welcome_seen` / `lastWelcomed`.
2. 📖 **Guide** — Purpose column + plan-file upload + back-to-Guide nav.
3. 📋 **Plan** — 7 numbered, bordered, drop-down (collapsed-by-default) sections in 2-col grid:
   - **01 Wealth Snapshot** — 8 groups · 34 asset classes · per-row Liquid/Invested toggle · monthly-income capture · CAS upload · Optimize flag for MFs/stocks. Liquid Corpus drives every calc; invested-asset income flows to Passive Income.
   - **02 Loans & Liabilities** — 4 groups · 13 loan types · per-row Active/Outstanding/Rate/EMI · 🔄 MaxGain flag on home loan · Avalanche/Snowball/MaxGain repayment-strategy picker.
   - **03 Monthly Budget** — 18 sub-categories with per-row frequency picker; flows into Withdrawal schedule.
   - **04 Profile & Settings** — sectioned (Corpus & Tax / Withdrawal / SIP / Advanced); Withdrawal slots read-only (synced from Budget).
   - **05 Demographics & Longevity**
   - **06 Inflation Assumptions**
   - **07 Insurance Cover** — 3 groups · 14 policy types · MWP Act flag · smart-insights gap engine.
   - **Cashflow Summary** at bottom — surplus deployment plan keyed to risk profile.
4. 👤 **Profile** — side-by-side Risk Profile + Risk Assessment cards; quick slider + 90s quiz + 15-question detailed assessment.
5. ⚖️ **Compare** (strategies) — strategy panel, cards, chart, table.
6. 🪣 **Buckets** (assets) — bucket asset-class explorer with risk-profile-driven recommendations.
7. 🔍 **Explorer** — side-by-side dropdowns, fund explorer.
8. 📊 **Simulate** — year-by-year bucket flow simulator with auto-play; Monte Carlo panel.
9. 🧾 **Tax** — tax engine panel; LTCG ₹1.25L exemption + 12.5% above; new-regime slabs.
10. ◆ **Insights** — merged insights panel.
11. 🤖 **AI** — Groq-powered chat for plan Q&A (BYO API key).

## Core engine

- **4-bucket cascade** (HDFC model): B1 emergency / B2 short debt / B3 hybrid/BAF / B4 equity. `B3 compounds freely; profits only flow to B2 when B2 needs replenishment.` See `src/lib/calculations/` and `src/lib/refillStrategy.ts`.
- **Net effective draw** = `monthlyWithdrawal − sipAmount`. This drives every downstream simulator, KPI strip, tax calc, and insights output.
- **Withdrawal & SIP schedules:** multi-frequency (monthly / quarterly / half-yearly / yearly). Legacy single-amount fields migrated on load (see `App.tsx` → `migrateLegacyToSchedule`).
- **Identity capture:** name persisted via WelcomePage before launch; used in downloadable Plan PDF.

## Codebase map

```
src/
├── App.tsx              # V1/V2 switch, profile loading, default state
├── main.tsx
├── components/
│   ├── Dashboard.tsx    # V1 shell, tab routing, progress bar
│   ├── Shell.tsx        # V2 shell (chat-first)
│   ├── Welcome*.tsx, Onboarding.tsx
│   ├── plan/            # FundList, PlanReveal, VerdictBadge
│   ├── buckets/         # BucketFundsExplorer
│   ├── profiles/        # ProfileGrid, ProfileDetail, ProfileComparison, ProfilesPanel, RiskQuiz
│   ├── strategies/      # StrategiesPanel, StrategyCard/Chart/Table
│   ├── tax/             # TaxPanel
│   ├── summary/         # SummaryPanel
│   ├── montecarlo/      # MonteCarloPanel
│   ├── chat/            # Interview, AnswerForm, Bubble, ThinkingState (V2)
│   └── ui/              # Badge, Button, Card
├── lib/
│   ├── calculations/    # Core simulation math
│   ├── calculations.ts  # Public exports (allocateBuckets, …)
│   ├── refillStrategy.ts
│   ├── storage.ts       # localStorage wrapper
│   ├── aiClient.ts      # Groq client
│   ├── market.ts, fundValidator.ts
│   ├── uploadParser.ts  # PDF/DOCX/XLSX → text + rawTextFull
│   ├── pdf.ts, comprehensiveReport.ts
│   ├── exporters/       # PDF/DOCX/PPTX/MD/CSV
│   └── data/            # Static data
├── hooks/               # useInterview, useMarketData, useStorage
├── types/               # index, identity, profiles, strategies, v2, shims
└── constants/
    ├── index.ts         # TAB_ITEMS, BUCKET_ALLOCATION, DEFAULT_* …
    └── curatedFunds.ts
```

## Key conventions

- **Storage keys** live in `src/lib/storage.ts` — never write to localStorage directly from components.
- **All money values in ₹.** No multi-currency. Inflation defaults: 6% general / 10% healthcare / 12% education.
- **No backend.** All state is client-side. If we ever add server features, that's a major architectural shift, not a casual one.
- **AI is opt-in** via user-supplied Groq key in Profile. No keys ever shipped in the repo.
- **V1 is the production shell.** V2 is experimental and flag-gated; don't break V1 while working on V2.

## Known gotchas

- `withdrawalSchedule` / `sipSchedule` are the canonical fields; `withdrawalAmount` / `sipAmount` + `withdrawalFrequency` / `sipFrequency` are legacy and migrated on load. New code should read the schedules.
- The Plan-tab Withdrawal slots in section 04 are **read-only** — they're derived from section 03 (Monthly Budget). Don't make them editable.
- B3 (hybrid/BAF) compounds freely; profits only cascade to B2 *when B2 needs replenishment*. This was a fix (commit `4566f0b`) — don't reintroduce the eager cascade.

## Related repos / artefacts

- `D:\claude\finance-prototype` — prototype sibling, deployed at finance-prototype-roan.vercel.app
- `D:\claude\finance-mobile`, `D:\claude\finance-mobile-prototype` — mobile variants
- `D:\claude\plan-for-claude-project` — Claude.ai Project knowledge files (chat-only assistant version)
- `C:\Users\IPR Chair\OneDrive\Documents\Claude\Projects\Financial Planning\` — manuals, PRDs, psychometric tool drafts, Module A integration notes

## Session log

| Date | What was done |
|------|---------------|
| 2026-04-04 | Project initialized, scope defined |
| 2026-04-19 → 2026-05-07 | V1 dashboard built out: 3→4 bucket model, cascade explainer, V2 chat interview behind flag, strategies/profiles/tax/summary, guided onboarding, multi-frequency schedules, identity capture, asset-class explorer, 17 new asset classes, Overview/Welcome/Insights/Guide/Explorer tabs, multi-format export, Profile tab redesign, Plan-tab 7-section restructure, prod merge. |
| 2026-05-17 | CLAUDE.md + tasks/todo.md refreshed to reflect current state. |
