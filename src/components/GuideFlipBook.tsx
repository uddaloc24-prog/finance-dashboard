// GuideFlipBook — the "How to use the planner" guide rendered as a
// 2-page-spread interactive book (Guide tab + Welcome-page modal).
// Built on BookCanvas (shared book chrome). Each page condenses one
// section from the original HowToUsePage editorial layout.
//
// onNavigate is wired through so the "Open this tab" buttons inside the
// book can flip the parent Dashboard's activeTab.

import { BookCanvas, PageBody, PageHeading, PageFooter, type Spread, type Chapter } from './BookCanvas'

type Tone = 'navy' | 'amber' | 'green'

interface Props {
  /** Tab id to navigate to when the user clicks an in-book action. */
  onNavigate?: (tab: string) => void
}

const CHAPTERS: Chapter[] = [
  { name: 'Cover',          spreadIdx: 0 },
  { name: 'Contents',       spreadIdx: 1 },
  { name: 'What this is',   spreadIdx: 1 },
  { name: 'Plan',           spreadIdx: 2 },
  { name: 'Profile',        spreadIdx: 2 },
  { name: 'Compare',        spreadIdx: 3 },
  { name: 'Buckets',        spreadIdx: 3 },
  { name: 'Simulate',       spreadIdx: 4 },
  { name: 'Tax',            spreadIdx: 4 },
  { name: 'Insights',       spreadIdx: 5 },
  { name: 'Tips',           spreadIdx: 5 },
  { name: 'Troubleshoot',   spreadIdx: 6 },
]

export function GuideFlipBook({ onNavigate }: Props) {
  const spreads: Spread[] = [
    { id: 'cover',         left: <CoverLeft />,                              right: <CoverRight /> },
    { id: 'whatthisis',    left: <TocPage />,                                right: <WhatThisIsPage /> },
    { id: 'plan-profile',  left: <PlanPage onNavigate={onNavigate} />,       right: <ProfilePage onNavigate={onNavigate} /> },
    { id: 'compare-bucket',left: <ComparePage onNavigate={onNavigate} />,    right: <BucketsPage onNavigate={onNavigate} /> },
    { id: 'sim-tax',       left: <SimulatePage onNavigate={onNavigate} />,   right: <TaxPage onNavigate={onNavigate} /> },
    { id: 'insights-tips', left: <InsightsPage onNavigate={onNavigate} />,   right: <TipsPage /> },
    { id: 'trouble-end',   left: <TroubleshootingPage />,                    right: <EndPage onNavigate={onNavigate} /> },
  ]
  return <BookCanvas spreads={spreads} chapters={CHAPTERS} pillRailLabel="Sections" />
}

// ─── Cover ─────────────────────────────────────────────────────────────

function CoverLeft() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-3 border-2 border-blue-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-5 border border-blue-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative">
        <div className="text-[10px] font-bold tracking-[5px] uppercase text-blue-700 mb-3">Quick Start · 5 minutes</div>
        <div className="text-6xl sm:text-7xl mb-2 leading-none">📖</div>
        <div className="font-serif italic text-base text-blue-900 mt-3">A field guide</div>
      </div>
    </div>
  )
}

function CoverRight() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-3 border-2 border-blue-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-5 border border-blue-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-900 leading-tight px-2">
          How to Use the Planner
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-slate-700 mt-3 max-w-xs mx-auto leading-snug">
          Five steps. Each tab does one job.
          <br />
          Walk in order — or jump around.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-10 bg-blue-500" />
          <span className="text-blue-700 text-sm">◆</span>
          <span className="h-px w-10 bg-blue-500" />
        </div>
        <p className="text-[11px] uppercase tracking-[3px] font-bold text-blue-800 mt-4">A Field Guide</p>
        <p className="text-[10px] text-slate-500 italic mt-1">Free · private · auto-saves as you type</p>
      </div>
    </div>
  )
}

// ─── TOC ──────────────────────────────────────────────────────────────

const TOC_ENTRIES = [
  { n: '00', title: 'What this is',     page: 3  },
  { n: '01', title: 'Plan — your numbers',      page: 4  },
  { n: '02', title: 'Profile — your risk',      page: 5  },
  { n: '03', title: 'Compare — 10 strategies',  page: 6  },
  { n: '04', title: 'Buckets — allocate corpus',page: 7  },
  { n: '05', title: 'Simulate — stress-test',   page: 8  },
  { n: '06', title: 'Tax — optimise',           page: 9  },
  { n: '07', title: 'Insights — the verdict',   page: 10 },
  { n: '08', title: 'Tips & troubleshooting',   page: 11 },
]

function TocPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="Contents" title="Nine sections, one walkthrough." />
      <ol className="mt-2 space-y-1.5">
        {TOC_ENTRIES.map((e) => (
          <li key={e.n} className="grid grid-cols-[28px_1fr_40px] items-baseline gap-2 border-b border-blue-200/60 pb-1">
            <span className="font-serif italic text-base font-extrabold text-blue-700 tabular-nums leading-none">{e.n}</span>
            <span className="font-serif text-[12px] font-bold text-slate-900 leading-tight">{e.title}</span>
            <span className="font-mono text-[10px] tabular-nums text-blue-800/80 text-right">p. {e.page}</span>
          </li>
        ))}
      </ol>
      <PageFooter chapter="Contents" pageNum={2} />
    </PageBody>
  )
}

// ─── 00. What this is ─────────────────────────────────────────────────

function WhatThisIsPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="00 · What this is" title="A free, private calculator." dropCap="A" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        A private on-device retirement analyser — not a transaction platform, not an advisor. It gives an honest verdict on whether your plan actually works.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="navy"><strong>Free.</strong> No signup. No ads.</Pill>
        <Pill tone="navy"><strong>Private.</strong> All data stays on this device.</Pill>
        <Pill tone="navy"><strong>Honest.</strong> FY 2024-25 rules · 200 Monte-Carlo paths.</Pill>
        <Pill tone="navy"><strong>Editable.</strong> Any input updates everything instantly.</Pill>
      </ul>
      <Callout tone="navy">
        Your data never leaves this browser — clear cache and it's gone.
      </Callout>
      <PageFooter chapter="00 · What this is" pageNum={3} />
    </PageBody>
  )
}

// ─── 01. Plan ─────────────────────────────────────────────────────────

function PlanPage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="01 · Plan tab" title="Tell us your numbers." dropCap="T" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Capture the four inputs that anchor every calculation.
      </p>
      <ol className="mt-2 space-y-1 text-[11px] text-slate-900 leading-snug">
        <NumItem n={1}><strong>Total corpus</strong> — FDs + MFs + EPF + PPF.</NumItem>
        <NumItem n={2}><strong>Monthly draw</strong> — expenses minus pension/rent.</NumItem>
        <NumItem n={3}><strong>Demographics</strong> — current age · retire age · life expectancy.</NumItem>
        <NumItem n={4}><strong>Expense mix</strong> — Essentials · Lifestyle · Health · Education.</NumItem>
      </ol>
      <Callout tone="navy">
        Don't worry about precision — change any number anytime; it auto-saves.
      </Callout>
      {onNavigate && <ActionBtn tone="navy" onClick={() => onNavigate('plan')}>Open the Plan tab →</ActionBtn>}
      <PageFooter chapter="01 · Plan" pageNum={4} />
    </PageBody>
  )
}

// ─── 02. Profile ──────────────────────────────────────────────────────

function ProfilePage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="02 · Profile tab" title="Find your risk profile." dropCap="F" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Two paths: take the 90-second quiz, or pick a profile manually.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="amber"><strong>Ultra-Conservative</strong> — SCSS + FDs only.</Pill>
        <Pill tone="amber"><strong>Conservative</strong> — Debt + a hybrid kicker.</Pill>
        <Pill tone="amber"><strong>Moderate ⭐</strong> — Default: 4-bucket SWP + BAF.</Pill>
        <Pill tone="amber"><strong>Mod. Aggressive</strong> — Equity-heavy + midcap.</Pill>
        <Pill tone="amber"><strong>Aggressive · FIRE</strong> — 70 %+ equity.</Pill>
      </ul>
      <Callout tone="amber">
        Your profile flows everywhere — funds, tax tips, bucket mix.
      </Callout>
      {onNavigate && <ActionBtn tone="amber" onClick={() => onNavigate('profiles')}>Open the Profile tab →</ActionBtn>}
      <PageFooter chapter="02 · Profile" pageNum={5} />
    </PageBody>
  )
}

// ─── 03. Compare ──────────────────────────────────────────────────────

function ComparePage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="03 · Compare tab" title="Ten strategies, head-to-head." dropCap="T" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Tests your numbers against ten frameworks — 4 %, Guyton-Klinger, India 4-Bucket SWP, NPS+Annuity, SCSS+PMVVY+FD ladder, RMD, TIPS, and more.
      </p>
      <p className="font-serif text-[11px] mt-2 text-slate-700"><strong>Each gets a verdict:</strong></p>
      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-800 leading-snug">
        <li><strong className="text-emerald-700">PASSES</strong> — sustains on your numbers.</li>
        <li><strong className="text-amber-700">PARTIAL</strong> — works with adjustments.</li>
        <li><strong className="text-rose-700">FAILS</strong> — won't sustain.</li>
        <li><strong className="text-blue-700">⭐ BEST FIT</strong> — your top match.</li>
      </ul>
      {onNavigate && <ActionBtn tone="navy" onClick={() => onNavigate('strategies')}>Open the Compare tab →</ActionBtn>}
      <PageFooter chapter="03 · Compare" pageNum={6} />
    </PageBody>
  )
}

// ─── 04. Buckets ──────────────────────────────────────────────────────

function BucketsPage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="04 · Buckets + Explorer" title="Allocate the corpus." dropCap="A" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Your corpus splits into four buckets — each with a job.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="green"><strong>B1 · Liquidity (10 %)</strong> — 1–2 yrs cash buffer (liquid funds).</Pill>
        <Pill tone="green"><strong>B2 · Fixed floor (20 %)</strong> — SCSS + FD ladder, untouched.</Pill>
        <Pill tone="green"><strong>B3 · Stability (25 %)</strong> — SWP source: BAF / hybrid.</Pill>
        <Pill tone="green"><strong>B4 · Growth (45 %)</strong> — Long-horizon equity refill.</Pill>
      </ul>
      <Callout tone="green">
        Use the Explorer tab to pick specific funds — recommendations are starred per profile.
      </Callout>
      {onNavigate && <ActionBtn tone="green" onClick={() => onNavigate('assets')}>Open the Buckets tab →</ActionBtn>}
      <PageFooter chapter="04 · Buckets" pageNum={7} />
    </PageBody>
  )
}

// ─── 05. Simulate ─────────────────────────────────────────────────────

function SimulatePage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="05 · Simulate tab" title="Stress-test the plan." dropCap="S" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Three checks reveal fragility before real money is at stake.
      </p>
      <ol className="mt-2 space-y-1 text-[11px] text-slate-900 leading-snug">
        <NumItem n={1}><strong>Corpus preservation</strong> — max safe draw over 20 yrs.</NumItem>
        <NumItem n={2}><strong>Monte-Carlo (200 paths)</strong> — ≥ 85 % is robust · 65–85 % marginal · &lt; 65 % needs work.</NumItem>
        <NumItem n={3}><strong>Year-by-year cascade</strong> — step through 25 years of withdrawals.</NumItem>
      </ol>
      <Callout tone="amber">
        Under 85 %? Drop the draw 10–15 % or move 5 % from B4 to B2.
      </Callout>
      {onNavigate && <ActionBtn tone="amber" onClick={() => onNavigate('simulate')}>Open the Simulate tab →</ActionBtn>}
      <PageFooter chapter="05 · Simulate" pageNum={8} />
    </PageBody>
  )
}

// ─── 06. Tax ──────────────────────────────────────────────────────────

function TaxPage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="06 · Tax tab" title="Optimise your tax bill." dropCap="O" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Two retirees with the same corpus can keep very different amounts — regime choice and harvesting decide.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="navy"><strong>Old vs New regime</strong> — cheaper one is flagged for your income.</Pill>
        <Pill tone="navy"><strong>LTCG harvesting</strong> — sell ₹1.25 L of B4 every Mar 31. Saves ≈ ₹3.9 L over 25 yrs.</Pill>
        <Pill tone="navy"><strong>80TTB</strong> — ₹50 k senior-citizen interest exemption.</Pill>
        <Pill tone="navy"><strong>Reshuffle tips</strong> — slab-aware: e.g. debt MF → arbitrage at 30 %.</Pill>
      </ul>
      {onNavigate && <ActionBtn tone="navy" onClick={() => onNavigate('tax')}>Open the Tax tab →</ActionBtn>}
      <PageFooter chapter="06 · Tax" pageNum={9} />
    </PageBody>
  )
}

// ─── 07. Insights ─────────────────────────────────────────────────────

function InsightsPage({ onNavigate }: Props) {
  return (
    <PageBody>
      <PageHeading eyebrow="07 · Insights tab" title="Read the full report." dropCap="R" />
      <p className="font-serif text-[11.5px] leading-relaxed text-slate-800 mt-2">
        Everything you've entered, synthesised into one editorial-style verdict.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="green"><strong>Executive verdict</strong> — On Track / Close / Not Achievable.</Pill>
        <Pill tone="green"><strong>Take-home actions</strong> — 3-para narrative + ranked steps.</Pill>
        <Pill tone="green"><strong>Top 3 strategies</strong> for your inputs.</Pill>
        <Pill tone="green"><strong>Download</strong> — PDF · Word · PPT · Markdown · Excel.</Pill>
      </ul>
      {onNavigate && <ActionBtn tone="green" onClick={() => onNavigate('insights')}>Open the Insights tab →</ActionBtn>}
      <PageFooter chapter="07 · Insights" pageNum={10} />
    </PageBody>
  )
}

// ─── 08. Tips ─────────────────────────────────────────────────────────

function TipsPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="08 · Tips" title="Get the most out of it." />
      <ul className="mt-2 space-y-1 text-[11px] text-slate-800 leading-snug">
        <Pill tone="amber"><strong>Re-run yearly.</strong> Union Budget shifts rules each Feb.</Pill>
        <Pill tone="amber"><strong>Save versions.</strong> The PDF you download is dated.</Pill>
        <Pill tone="amber"><strong>Validate.</strong> Show the PDF to a SEBI-RIA or your CA.</Pill>
        <Pill tone="amber"><strong>Install as an app.</strong> Header → Install · works offline.</Pill>
        <Pill tone="amber"><strong>Reset</strong> in the header clears all data.</Pill>
      </ul>
      <PageFooter chapter="08 · Tips" pageNum={11} />
    </PageBody>
  )
}

// ─── 09. Troubleshooting ──────────────────────────────────────────────

function TroubleshootingPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="09 · Troubleshooting" title="Common questions." dropCap="C" />
      <ul className="mt-2 space-y-1 text-[10.5px] text-slate-800 leading-snug">
        <Pill tone="navy"><strong>"Welcome reappeared."</strong> By design — it returns every 7 days.</Pill>
        <Pill tone="navy"><strong>"My data is gone."</strong> Cache cleared or incognito — data is device-local.</Pill>
        <Pill tone="navy"><strong>"No Install button."</strong> iPhone? Use Safari → Share → Add to Home Screen.</Pill>
        <Pill tone="navy"><strong>"Numbers feel wrong."</strong> Check return assumptions on Buckets · verify slab.</Pill>
      </ul>
      <PageFooter chapter="09 · Troubleshoot" pageNum={12} />
    </PageBody>
  )
}

// ─── End ──────────────────────────────────────────────────────────────

function EndPage({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-4 border-2 border-blue-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-6 border border-blue-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative">
        <div className="text-5xl mb-3 leading-none">🚀</div>
        <h2 className="font-serif text-2xl font-extrabold text-blue-900 leading-tight">~ Ready to plan ~</h2>
        <p className="font-serif italic text-[12px] text-slate-700 mt-4 max-w-xs mx-auto leading-snug">
          Five tabs · five steps.
          <br />
          Start with Plan — change anything later.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-10 bg-blue-500" />
          <span className="text-blue-700 text-sm">◆</span>
          <span className="h-px w-10 bg-blue-500" />
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('plan')}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-700 text-white text-[12px] font-bold tracking-wider uppercase hover:bg-blue-800 shadow-sm transition-colors"
          >
            Begin with Plan →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page primitives (guide-specific) ─────────────────────────────────

const TONE_BORDER: Record<Tone, string> = {
  navy:  'border-blue-300 bg-blue-50/60',
  amber: 'border-amber-300 bg-amber-50/60',
  green: 'border-emerald-300 bg-emerald-50/60',
}
const TONE_BAR: Record<Tone, string> = {
  navy:  'bg-blue-700',
  amber: 'bg-amber-600',
  green: 'bg-emerald-600',
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <li className={`rounded-sm border ${TONE_BORDER[tone]} px-2 py-1 text-slate-800`}>
      {children}
    </li>
  )
}

function NumItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[18px_1fr] items-baseline gap-1.5">
      <span className="font-serif italic text-base font-extrabold text-blue-700 tabular-nums leading-none">{n}</span>
      <span>{children}</span>
    </li>
  )
}

function Callout({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`rounded-sm border ${TONE_BORDER[tone]} px-2 py-1.5 mt-2 text-[10.5px] italic text-slate-800 leading-snug`}>
      💡 {children}
    </div>
  )
}

function ActionBtn({ tone, onClick, children }: { tone: Tone; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold tracking-wider uppercase text-white ${TONE_BAR[tone]} hover:brightness-110 shadow-sm transition-all`}
    >
      {children}
    </button>
  )
}
