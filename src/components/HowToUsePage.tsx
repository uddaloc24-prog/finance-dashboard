// How To Use — guided walkthrough shown automatically after the welcome
// screen on first dashboard visit, and always available via the nav tab.
//
// Layman-friendly: short sentences, action verbs, one concept per bullet,
// thick tone-coloured borders to delineate sections.

import type { ReactNode } from 'react'

interface Props {
  onDone: (tab: string) => void
}

export function HowToUsePage({ onDone }: Props) {
  return (
    <article className="bg-white">
      {/* Hero */}
      <header className="border-b-2 border-slate-900 pb-6 mb-8">
        <div className="text-[11px] font-bold tracking-[4px] uppercase text-amber-700 mb-2">
          Quick Start · Five Minutes
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-slate-900 leading-[1.1]">
          How to use this <em className="not-italic font-extrabold">planner.</em>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Five steps. Each tab does one job. Walk through in order or jump around — your inputs save automatically as you type.
        </p>
      </header>

      <div className="space-y-5">
        {/* What this is */}
        <Block tone="navy" num="00" eyebrow="What this is" title="A free, private retirement calculator" purpose="Set expectations up front. This is a private, on-device analytical tool that gives an honest verdict on whether your retirement plan actually works — not a transaction platform and not an advisor.">
          <Bullet><strong>Free.</strong> No signup. No subscription. No ads.</Bullet>
          <Bullet><strong>Private.</strong> All your data stays on this device. Nothing is sent to a server.</Bullet>
          <Bullet><strong>Honest.</strong> The verdict is based on real Indian tax rules (FY 2024-25), inflation, and 200 simulated future paths — not optimistic guesswork.</Bullet>
          <Bullet><strong>Editable.</strong> Change any input anytime; every chart and recommendation recomputes instantly.</Bullet>
        </Block>

        {/* Step 1 — Plan */}
        <Block tone="navy" num="01" eyebrow="Step 1 · Plan tab" title="Tell us your numbers" purpose="Capture the four inputs that anchor every downstream calculation — corpus, monthly draw, demographics, and expense mix. Without these, every chart and recommendation in later tabs is meaningless.">
          <p className="text-sm text-slate-700 mb-2">Open the <ChipNav>Plan</ChipNav> tab. Enter four things:</p>
          <Numbered>
            <Item title="Total corpus">The rupee amount you've saved for retirement (FDs + mutual funds + EPF + PPF + everything earmarked).</Item>
            <Item title="Monthly draw target">How much you want to withdraw each month — typically your monthly expenses minus pension/rental income.</Item>
            <Item title="Demographics">Your current age, planned retirement age, life expectancy. The planner uses 90 by default — push to 95 if family history is long.</Item>
            <Item title="Monthly expense breakdown">Split into Essentials, Lifestyle, Healthcare, Education. Healthcare and education inflate faster than general (10%/12% vs 6.5%).</Item>
          </Numbered>
          <Callout tone="navy">
            Don't worry about getting numbers exact — change them later. The planner saves automatically.
          </Callout>
          <ActionBtn onClick={() => onDone('plan')} tone="navy">Take me to Plan →</ActionBtn>
        </Block>

        {/* Step 2 — Profile */}
        <Block tone="amber" num="02" eyebrow="Step 2 · Profile tab" title="Find your risk profile" purpose="Calibrate how much volatility your plan can absorb. The profile you pick flows into every fund recommendation, bucket mix, tax tip, and stress test that comes later — get this right and the rest of the planner adapts to you.">
          <p className="text-sm text-slate-700 mb-2">Open the <ChipNav>Profile</ChipNav> tab. Two ways:</p>
          <Numbered>
            <Item title="Take the 90-second quiz">10 questions about your time horizon, risk tolerance, and goals. Score 10–50 maps to a profile.</Item>
            <Item title="Pick manually">Click "Choose this" on any of the 5 profile columns. The Moderate profile is the default for most retirees.</Item>
          </Numbered>
          <p className="text-sm text-slate-700 mt-3">The five profiles, simply put:</p>
          <ul className="text-xs text-slate-700 mt-1 space-y-1 ml-4">
            <li><strong>Ultra-Conservative:</strong> SCSS + FDs only. Safe, but inflation eats real value.</li>
            <li><strong>Conservative:</strong> Mostly debt + a small equity hybrid kicker.</li>
            <li><strong>Moderate ⭐:</strong> The recommended default. 4-bucket SWP with BAF.</li>
            <li><strong>Moderately Aggressive:</strong> Equity-heavy + midcap.</li>
            <li><strong>Aggressive / FIRE:</strong> 70%+ equity, for early retirees with long horizons.</li>
          </ul>
          <Callout tone="amber">
            Your profile choice flows everywhere — fund picks, tax advice, recommended bucket mix.
          </Callout>
          <ActionBtn onClick={() => onDone('profiles')} tone="amber">Take me to Profile →</ActionBtn>
        </Block>

        {/* Step 3 — Compare */}
        <Block tone="navy" num="03" eyebrow="Step 3 · Compare tab" title="See ten strategies head-to-head" purpose="Replace guesswork ('is the 4% rule safe?') with empirical evidence. Test ten well-known retirement frameworks against your exact numbers and see which one earns a PASS, which buckle under your draw, and which is the best fit overall.">
          <p className="text-sm text-slate-700 mb-2">Open the <ChipNav>Compare</ChipNav> tab. The planner runs your inputs against ten retirement strategies:</p>
          <ul className="text-xs text-slate-700 mt-1 space-y-1 ml-4">
            <li>4% Rule (Trinity Study) · Guyton-Klinger Guardrails · Vanguard Dynamic</li>
            <li>3-Bucket Classic · India 4-Bucket SWP ⭐ · NPS + Annuity Hybrid</li>
            <li>SCSS + PMVVY + FD Ladder · RMD-Based · TIPS Ladder · Constant %</li>
          </ul>
          <p className="text-sm text-slate-700 mt-3">Each strategy gets a verdict:</p>
          <ul className="text-xs text-slate-700 mt-1 space-y-1 ml-4">
            <li><strong className="text-emerald-700">PASSES</strong> — works on your numbers</li>
            <li><strong className="text-amber-700">PARTIAL</strong> — works with adjustments</li>
            <li><strong className="text-red-700">FAILS</strong> — won't sustain on your inputs</li>
            <li><strong className="text-slate-500">N/A</strong> — not available in India</li>
            <li><strong className="text-blue-700">⭐ BEST FIT</strong> — your top match</li>
          </ul>
          <ActionBtn onClick={() => onDone('strategies')} tone="navy">Take me to Compare →</ActionBtn>
        </Block>

        {/* Step 4 — Buckets + Explorer */}
        <Block tone="green" num="04" eyebrow="Step 4 · Buckets & Explorer tabs" title="Allocate the corpus" purpose="Translate the chosen strategy into a concrete asset allocation — first as a four-bucket split, then as named, investable funds and instruments you can actually buy. This is where abstract advice becomes a portfolio.">
          <p className="text-sm text-slate-700 mb-2">Your corpus splits into <strong>four buckets</strong>:</p>
          <Numbered>
            <Item title="B1 — Liquidity (~10%)">Cash buffer for the next 1–2 years of withdrawals. Liquid funds.</Item>
            <Item title="B2 — Fixed Floor (~20%)">SCSS + FD ladder. Held 5 years to maturity. Never touched.</Item>
            <Item title="B3 — Stability (~25%)">SWP source. Balanced Advantage Fund or hybrid. Pays your monthly income.</Item>
            <Item title="B4 — Growth (~45%)">Long-horizon equity. Refills B3 each year via interest harvest.</Item>
          </Numbered>
          <p className="text-sm text-slate-700 mt-3">Open <ChipNav>Buckets</ChipNav> to adjust the split. Open <ChipNav>Explorer</ChipNav> to pick specific funds and instruments per bucket — the recommended ones for your risk profile are starred.</p>
          <ActionBtn onClick={() => onDone('assets')} tone="green">Take me to Buckets →</ActionBtn>
        </Block>

        {/* Step 5 — Simulate */}
        <Block tone="amber" num="05" eyebrow="Step 5 · Simulate tab" title="Stress-test the plan" purpose="Verify robustness. A plan that works in the average case but fails in 35% of futures is fragile — Monte Carlo, year-by-year cascade, and the year-5 crash test reveal that fragility before real money is at stake.">
          <p className="text-sm text-slate-700 mb-2">Open the <ChipNav>Simulate</ChipNav> tab. Three checks:</p>
          <Numbered>
            <Item title="Corpus Preservation">The maximum monthly draw your corpus can sustain across 20 years without dipping below the starting amount.</Item>
            <Item title="Monte Carlo (200 paths)">200 random futures with realistic market volatility. Click "Run simulation". Look at the success rate — <strong className="text-emerald-700">≥ 85% is a robust plan</strong>; <strong className="text-amber-700">65–85% is marginal</strong>; below 65% needs structural changes.</Item>
            <Item title="Year-by-year cascade">Step through 25 years one at a time. See exactly how money flows between buckets and how withdrawals compound.</Item>
          </Numbered>
          <Callout tone="amber">
            If Monte Carlo success drops below 85%, the plan is fragile. Try lowering the monthly draw 10–15% or shifting 5% of corpus from B4 to B2.
          </Callout>
          <ActionBtn onClick={() => onDone('simulate')} tone="amber">Take me to Simulate →</ActionBtn>
        </Block>

        {/* Tax tab */}
        <Block tone="navy" num="06" eyebrow="After planning · Tax tab" title="Optimise your tax bill" purpose="Maximise post-tax monthly income. Two retirees with identical gross corpus can take home very different amounts depending on regime choice, LTCG harvesting, 80TTB use, and slab management — this tab makes those choices explicit.">
          <p className="text-sm text-slate-700 mb-2">Open <ChipNav>Tax</ChipNav>. You'll see:</p>
          <Bullet><strong>Annual tax breakdown</strong> by source — slab tax on interest, LTCG on equity, 80TTB exemption for seniors.</Bullet>
          <Bullet><strong>Old vs New regime</strong> comparison — the cheaper one is flagged for your income level.</Bullet>
          <Bullet><strong>LTCG harvesting schedule</strong> — every March 31, sell ₹1,25,000 of B4 equity gains and re-buy. Saves ~₹3.9 L over 25 years.</Bullet>
          <Bullet><strong>Reshuffle advice</strong> — slab-aware tips like "Switch debt MFs to arbitrage at 30% slab" or "Use 80TTB ₹50k carve-out".</Bullet>
          <ActionBtn onClick={() => onDone('tax')} tone="navy">Take me to Tax →</ActionBtn>
        </Block>

        {/* Insights tab */}
        <Block tone="green" num="07" eyebrow="The verdict · Insights tab" title="Read the full report" purpose="Synthesise everything you've entered into one editorial-style verdict and produce a downloadable record of the plan — so you can share it with a CA or a SEBI-registered advisor, or revisit it next year and see what changed.">
          <p className="text-sm text-slate-700 mb-2">Open <ChipNav>Insights</ChipNav>. Everything in one editorial-style page:</p>
          <Bullet><strong>Executive verdict</strong> — On Track / Close / Not Achievable, with a McKinsey-style pull quote.</Bullet>
          <Bullet><strong>Take-home actions</strong> — 3-paragraph narrative + ranked next steps.</Bullet>
          <Bullet><strong>Top 3 strategies</strong> for your inputs.</Bullet>
          <Bullet><strong>Download</strong> in any of 5 formats: PDF / Word / PowerPoint / Markdown / Excel — your name on every page.</Bullet>
          <ActionBtn onClick={() => onDone('insights')} tone="green">Take me to Insights →</ActionBtn>
        </Block>

        {/* Tips */}
        <Block tone="amber" num="08" eyebrow="Tips" title="Get the most out of it" purpose="Maintain the plan over time. Retirement is a 25–30 year commitment and tax law, market regimes, and personal expenses all shift along the way — these habits keep the plan honest as the world changes around it.">
          <Bullet><strong>Re-run yearly.</strong> After every Union Budget (early Feb), tax rules change — re-open the planner and verify.</Bullet>
          <Bullet><strong>Take notes.</strong> The Insights PDF you download is dated. Save versions as you iterate.</Bullet>
          <Bullet><strong>Validate before acting.</strong> Show the PDF to a SEBI-registered advisor or your CA before opening accounts.</Bullet>
          <Bullet><strong>Install as an app.</strong> Tap the <strong>Install App</strong> button in the header — runs full-screen, works offline.</Bullet>
          <Bullet><strong>Reset</strong> in the header clears all data and restarts from welcome.</Bullet>
        </Block>

        {/* Troubleshooting */}
        <Block tone="navy" num="09" eyebrow="Troubleshooting" title="Common questions" purpose="Self-service answers to the questions almost everyone asks the first time — saves a search, demystifies expected behaviour, and prevents the planner from feeling broken when it's actually doing the right thing.">
          <Bullet><strong>"Welcome screen reappeared."</strong> By design — it returns every 7 days as a refresher. Click "Start planning" to skip it.</Bullet>
          <Bullet><strong>"My data is gone."</strong> Browser cache cleared, or you used incognito mode. Data lives in <em>this device's</em> browser only.</Bullet>
          <Bullet><strong>"Install button doesn't show."</strong> On iPhone, use Safari → Share → Add to Home Screen. Chrome on iOS doesn't support PWA install (Apple restriction).</Bullet>
          <Bullet><strong>"Numbers feel wrong."</strong> Check return assumptions on the Buckets tab — defaults are conservative-realistic. Also verify your tax slab is correct.</Bullet>
          <Bullet><strong>"V2 chat won't work."</strong> Add <code className="text-[10px] bg-slate-100 px-1">?v2=1</code> to the URL. The chat-first variant is opt-in.</Bullet>
        </Block>
      </div>

      <footer className="mt-10 pt-6 border-t-2 border-slate-900">
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-3">Ready to start?</div>
        <button
          type="button"
          onClick={() => onDone('plan')}
          className="w-full sm:w-auto px-8 py-3 rounded-md bg-blue-700 text-white text-base font-bold shadow-sm hover:bg-blue-800 active:bg-blue-900 transition-colors"
        >
          Begin with Step 1 · Plan →
        </button>
        <p className="text-[10px] text-slate-500 mt-3 italic">
          You can revisit this guide anytime — it's the <strong>Guide</strong> tab in the navigation.
        </p>
      </footer>
    </article>
  )
}

// ── Layout primitives ─────────────────────────────────────────────────

type Tone = 'navy' | 'amber' | 'green'

const TONES: Record<Tone, { border: string; bar: string; text: string; bg: string; ring: string }> = {
  navy:  { border: 'border-blue-400',    bar: 'bg-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-50',    ring: 'ring-blue-100' },
  amber: { border: 'border-amber-400',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-100' },
  green: { border: 'border-emerald-400', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
}

function Block({ tone, num, eyebrow, title, purpose, children }: { tone: Tone; num: string; eyebrow: string; title: string; purpose: string; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <section className={`relative bg-white rounded-lg border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
      <header className="px-4 sm:px-5 pt-5 pb-3 border-b-2 border-slate-100">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className={`font-serif text-2xl font-extralight ${t.text} tabular-nums leading-none`}>{num}</span>
          <span className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text}`}>{eyebrow}</span>
        </div>
        <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 leading-tight">{title}</h2>
      </header>
      <div className="grid lg:grid-cols-[2fr_1fr]">
        {/* What to do */}
        <div className="px-4 sm:px-5 py-4 space-y-2.5 lg:border-r-2 lg:border-slate-200">
          <div className={`text-[10px] font-bold tracking-[3px] uppercase ${t.text} mb-1`}>What to do</div>
          {children}
        </div>
        {/* Purpose — sits beside on desktop, below on mobile */}
        <aside className={`px-4 sm:px-5 py-4 ${t.bg} border-t-2 lg:border-t-0 border-slate-200`}>
          <div className={`text-[10px] font-bold tracking-[3px] uppercase ${t.text} mb-2`}>Purpose</div>
          <p className="text-sm text-slate-800 leading-relaxed">{purpose}</p>
        </aside>
      </div>
    </section>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 text-sm text-slate-700 leading-relaxed">
      <span className="shrink-0 text-amber-700 font-bold mt-0.5" aria-hidden="true">•</span>
      <span>{children}</span>
    </div>
  )
}

function Numbered({ children }: { children: ReactNode }) {
  return <ol className="space-y-2.5">{children}</ol>
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center mt-0.5"></span>
      <div className="flex-1 text-sm text-slate-700 leading-snug">
        <strong className="text-slate-900">{title}.</strong> {children}
      </div>
    </li>
  )
}

function Callout({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <div className={`rounded-md border-2 ${t.border} ${t.bg} px-3 py-2 text-xs text-slate-800 mt-3 italic`}>
      💡 {children}
    </div>
  )
}

function ChipNav({ children }: { children: ReactNode }) {
  return <span className="inline-block bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 align-middle">{children}</span>
}

function ActionBtn({ tone, onClick, children }: { tone: Tone; onClick: () => void; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-white ${t.bar} hover:brightness-110 transition-all`}
    >
      {children}
    </button>
  )
}
