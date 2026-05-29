// PlaybookFlipBook — the Indian Retirement & Financial Planning
// Playbook rendered as a 2-page-spread interactive book.
//
// Nine spreads, answering five questions in order — Why · What · When ·
// For Whom · How — then grounding them in reality data, traditions
// (Indian + Western), common mistakes, action items, reflection
// questions, and a working library of cited sources.
//
// Book chrome (leather binding, spine, leaf-flip, arrows, pill rail) is
// supplied by BookCanvas. This file is only content + page primitives.
//
// Wisdom is sourced from named authors and primary texts — Bogle,
// Bernstein, Bengen, Merton, Pfau, Buffett, Housel, Graham, Malkiel
// (West); Kauṭilya / Arthaśāstra, Bhagavad-Gītā, Tirukkuṛaḷ, Chāṇakya,
// Halan, Subramanyam, Pattu (East).

import { BookCanvas, PageBody, PageHeading, PageFooter, type Spread, type Chapter } from './BookCanvas'

const SPREADS: Spread[] = [
  { id: 'cover',          left: <CoverLeft />,        right: <CoverRight /> },
  { id: 'toc-foreword',   left: <TocPage />,          right: <ForewordPage /> },
  { id: 'why-what',       left: <WhyPage />,          right: <WhatPage /> },
  { id: 'when-forwhom',   left: <WhenPage />,         right: <ForWhomPage /> },
  { id: 'how-reality',    left: <HowPage />,          right: <RealityPage /> },
  { id: 'phases-east',    left: <PhasesPage />,       right: <WisdomEastPage /> },
  { id: 'west-mistakes',  left: <WisdomWestPage />,   right: <MistakesPage /> },
  { id: 'action-reflect', left: <ActionPage />,       right: <ReflectPage /> },
  { id: 'sources-end',    left: <SourcesPage />,      right: <EndPage /> },
]

const CHAPTERS: Chapter[] = [
  { name: 'Cover',       spreadIdx: 0 },
  { name: 'Contents',    spreadIdx: 1 },
  { name: 'Foreword',    spreadIdx: 1 },
  { name: 'Why',         spreadIdx: 2 },
  { name: 'What',        spreadIdx: 2 },
  { name: 'When',        spreadIdx: 3 },
  { name: 'For Whom',    spreadIdx: 3 },
  { name: 'How',         spreadIdx: 4 },
  { name: 'Reality',     spreadIdx: 4 },
  { name: 'Phases',      spreadIdx: 5 },
  { name: 'East Wisdom', spreadIdx: 5 },
  { name: 'West Wisdom', spreadIdx: 6 },
  { name: 'Mistakes',    spreadIdx: 6 },
  { name: 'Action',      spreadIdx: 7 },
  { name: 'Reflect',     spreadIdx: 7 },
  { name: 'Sources',     spreadIdx: 8 },
]

export function PlaybookFlipBook() {
  return <BookCanvas spreads={SPREADS} chapters={CHAPTERS} pillRailLabel="Chapters" />
}

// ─── Spread 0 — Cover ──────────────────────────────────────────────────

function CoverLeft() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-3 border-2 border-amber-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-5 border border-amber-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative">
        <div className="text-[10px] font-bold tracking-[5px] uppercase text-amber-700 mb-3">Welcome · नमस्ते</div>
        <div className="text-6xl sm:text-7xl mb-2 leading-none">🙏</div>
        <div className="font-serif text-3xl text-amber-900 mt-1">नमस्ते</div>
      </div>
    </div>
  )
}

function CoverRight() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-3 border-2 border-amber-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-5 border border-amber-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative px-2">
        <p className="text-[9px] font-bold tracking-[3px] uppercase text-amber-700 mb-1">The Indian</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-900 leading-tight">
          Retirement &amp; Financial<br />Planning Playbook
        </h1>
        <p className="font-serif italic text-[12.5px] sm:text-[13px] text-slate-700 mt-3 max-w-xs mx-auto leading-snug">
          Plan the years. Live the days.
          <br />
          Live without fear — head held high.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-10 bg-amber-500" />
          <span className="text-amber-700 text-sm">◆</span>
          <span className="h-px w-10 bg-amber-500" />
        </div>
        <p className="text-[10px] uppercase tracking-[3px] font-bold text-amber-800 mt-3">FY 2025 – 26</p>
        <p className="text-[9.5px] text-slate-500 italic mt-1">Synthesised from 30 + books · East &amp; West</p>
      </div>
    </div>
  )
}

// ─── Spread 1 — Contents · Foreword ───────────────────────────────────

const TOC_ENTRIES: Array<{ n: string; title: string; page: number }> = [
  { n: 'I',    title: 'Foreword',                page: 3  },
  { n: 'II',   title: 'The Why',                 page: 4  },
  { n: 'III',  title: 'The What',                page: 5  },
  { n: 'IV',   title: 'The When',                page: 6  },
  { n: 'V',    title: 'For Whom',                page: 7  },
  { n: 'VI',   title: 'The How — Four Buckets', page: 8  },
  { n: 'VII',  title: 'Reality Check',           page: 9  },
  { n: 'VIII', title: 'Two Phases',              page: 10 },
  { n: 'IX',   title: 'Wisdom — East',           page: 11 },
  { n: 'X',    title: 'Wisdom — West',           page: 12 },
  { n: 'XI',   title: 'Mistakes &amp; Fixes',    page: 13 },
  { n: 'XII',  title: 'Action — Four Themes',    page: 14 },
  { n: 'XIII', title: 'Five Reflections',        page: 15 },
  { n: 'XIV',  title: 'Sources &amp; Library',   page: 16 },
]

function TocPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="Contents" title="Fourteen chapters, one method." />
      <ol className="mt-2 space-y-1">
        {TOC_ENTRIES.map((e) => (
          <li key={e.n} className="grid grid-cols-[30px_1fr_38px] items-baseline gap-1.5 border-b border-amber-200/60 pb-0.5">
            <span className="font-serif italic text-[12px] font-extrabold text-amber-700 leading-none">{e.n}</span>
            <span className="font-serif text-[11.5px] font-bold text-slate-900 leading-tight"
                  dangerouslySetInnerHTML={{ __html: e.title }} />
            <span className="font-mono text-[9.5px] tabular-nums text-amber-800/80 text-right">p. {e.page}</span>
          </li>
        ))}
      </ol>
      <PageFooter chapter="Contents" pageNum={2} />
    </PageBody>
  )
}

function ForewordPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="I · Foreword" title="A synthesis of two civilisations." dropCap="A" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        This playbook is a synthesis. Three decades of Western life-cycle finance — <em>Bogle on costs, Bengen on the safe withdrawal, Merton on income, Pfau on the red zone, Housel on temperament</em> — meet two millennia of Indian wisdom on wealth, duty, and the householder's later years: <em>Kauṭilya's Arthaśāstra, the Bhagavad-Gītā, the Tirukkuṛaḷ, Chāṇakya's Hitopadeśa</em>.
      </p>
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        Every page answers one question. <strong>Why</strong> plan at all. <strong>What</strong> this is and isn't. <strong>When</strong> to act. <strong>For whom</strong> each strategy fits. <strong>How</strong> to do the work. The rest are reality checks, traditions, mistakes to avoid, and the questions you must ask yourself before any spreadsheet figure means anything.
      </p>
      <Pull source="Morgan Housel · The Psychology of Money, 2020">
        “Wealth is what you don't see — the cars not bought, the watches not worn, the upgrades passed up.”
      </Pull>
      <PageFooter chapter="I · Foreword" pageNum={3} />
    </PageBody>
  )
}

// ─── Spread 2 — Why · What ────────────────────────────────────────────

function WhyPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="II · The Why" title="Retirement is the consequential one." dropCap="R" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        After marriage, retirement is the single most consequential financial decision a person makes. You will live 25 – 35 years off a corpus that must grow faster than it shrinks, in a country where <strong>71 %</strong> of seniors have <strong>no pension</strong> and the joint-family safety net is fragmenting.
      </p>
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        Mercer's 2025 Global Pension Index gave India a <strong>D-grade</strong> (45.9 / 100). The Sensex's 13 % nominal CAGR over 30 years masks a brutal truth — a retiree withdrawing 6 % through a poor sequence runs dry by year nineteen. The math does not care what you intended.
      </p>
      <Pull source="Robert C. Merton · HBR “The Crisis in Retirement Planning,” 2014">
        “The retirement crisis is real — and personal. No collective bailout is coming.”
      </Pull>
      <Pull source="Bill Bengen · J. Financial Planning, 1994 (the “4 % paper”)">
        “A 4 % first-year withdrawal, adjusted annually for inflation, survived 30 years across nearly every historical sequence — but only just.”
      </Pull>
      <p className="font-serif italic text-[10.5px] text-slate-600 mt-2 leading-snug">
        A 35-year-old can recover from a wrong turn. A 70-year-old cannot.
      </p>
      <PageFooter chapter="II · The Why" pageNum={4} />
    </PageBody>
  )
}

function WhatPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="III · The What" title="This is a method, not advice." dropCap="T" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        This is a corpus-first, four-bucket, tax-aware withdrawal framework for Indians aged 50 and over. It is not a sales pitch. It is not personalised advice. It is not a transaction platform. It is a <em>method</em>.
      </p>
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        It weaves Western retirement-income theory (<strong>Bogle</strong> on indexing &amp; cost, <strong>Bengen</strong> on safe-withdrawal math, <strong>Pfau</strong> on the income red-zone, <strong>Bernstein</strong> on portfolio design) with Indian-tax-aware execution: SCSS, FD ladders, NPS, equity LTCG at ₹1.25 L, 80TTB, and the household reality of joint families and lumpy income.
      </p>
      <Pull source="John C. Bogle · The Little Book of Common Sense Investing, 2007">
        “The two greatest enemies of the equity fund investor are expenses and emotions.”
      </Pull>
      <Pull source="William Bernstein · The Four Pillars of Investing, 2002">
        “If you don't manage your portfolio with realistic expectations, no one else will.”
      </Pull>
      <p className="font-serif italic text-[10.5px] text-slate-600 mt-2 leading-snug">
        Most planners are a buffet of options. This one tells you which spoon to use.
      </p>
      <PageFooter chapter="III · The What" pageNum={5} />
    </PageBody>
  )
}

// ─── Spread 3 — When · For Whom ───────────────────────────────────────

function WhenPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="IV · The When" title="Vedic stages, modern timing." dropCap="V" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-md border border-amber-300 bg-amber-50/40 p-1.5">
          <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-amber-700 mb-1">The four āśramas</div>
          <ul className="text-[10px] text-slate-800 space-y-0.5 leading-snug">
            <li>· <strong>0 – 25</strong> Brahmacharya — student</li>
            <li>· <strong>25 – 50</strong> Gṛhastha — householder</li>
            <li>· <strong>50 – 75</strong> Vānaprastha — transition</li>
            <li>· <strong>75 +</strong> Sannyāsa — renunciation</li>
          </ul>
        </div>
        <div className="rounded-md border border-blue-300 bg-blue-50/40 p-1.5">
          <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-blue-700 mb-1">Modern timeline</div>
          <ul className="text-[10px] text-slate-800 space-y-0.5 leading-snug">
            <li>· <strong>40 – 50</strong> sketch the plan</li>
            <li>· <strong>50 – 55</strong> firm allocations</li>
            <li>· <strong>55 – 60</strong> lock SCSS / FD floor</li>
            <li>· <strong>60 – 65</strong> stress-test yearly</li>
            <li>· <strong>65 +</strong> execute cascade</li>
          </ul>
        </div>
      </div>
      <Pull source="Wade D. Pfau · Safety-First Retirement Planning, 2019">
        “Sequence-of-returns risk peaks in the ten years before and after retirement — the <em>red zone</em>.”
      </Pull>
      <p className="font-serif text-[10.5px] leading-snug text-slate-800 mt-2">
        Vānaprastha was never about disappearing — it was about <em>quiet, deliberate transition</em>. Build before fifty, transition between fifty and sixty-five, execute calmly thereafter.
      </p>
      <PageFooter chapter="IV · The When" pageNum={6} />
    </PageBody>
  )
}

function ForWhomPage() {
  const rows = [
    { who: 'Salaried professional', lever: 'PF + ESI floor. Lever NPS to ₹50 L by 60.' },
    { who: 'Government servant',    lever: 'Pension + DA covers floor. Watch inflation drag.' },
    { who: 'Business owner',        lever: 'No automatic pension. Build SCSS + FD aggressively.' },
    { who: 'Self-employed pro.',    lever: 'Lumpy income. Review monthly draw yearly.' },
    { who: 'NRI returning home',    lever: 'Rupee-depreciation hedge + DTAA awareness.' },
  ]
  return (
    <PageBody>
      <PageHeading eyebrow="V · For Whom" title="Five archetypes, one method." dropCap="F" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        The four-bucket method scales across Indian retirees, but the <em>bias</em> and tax angles shift by profile. Find yours.
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[18px_1fr] items-baseline gap-1.5 border-b border-amber-200/50 pb-0.5">
            <span className="font-serif italic text-[12px] font-extrabold text-amber-700 tabular-nums">{i + 1}</span>
            <div className="leading-snug">
              <div className="font-serif text-[11px] font-bold text-slate-900">{r.who}</div>
              <div className="font-serif text-[10.5px] text-slate-700 italic">{r.lever}</div>
            </div>
          </li>
        ))}
      </ul>
      <Pull source="Monika Halan · Let's Talk Money, 2018">
        “The financial mistake most Indians make is mistaking insurance for investment.”
      </Pull>
      <PageFooter chapter="V · For Whom" pageNum={7} />
    </PageBody>
  )
}

// ─── Spread 4 — How (4-bucket) · Reality ──────────────────────────────

function HowPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="VI · The How" title="The four-bucket cascade." dropCap="T" />
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <BucketCard tone="navy"    label="B1 · Liquidity" pct="10 %" body="1 – 2 yrs cash · liquid funds." />
        <BucketCard tone="emerald" label="B2 · Floor"     pct="20 %" body="SCSS + FD ladder · 5 rungs · held to maturity." />
        <BucketCard tone="amber"   label="B3 · Stability" pct="25 %" body="BAF / hybrid · SWP source for monthly income." />
        <BucketCard tone="rose"    label="B4 · Growth"    pct="45 %" body="Index equity · 25-yr horizon · refills B3 yearly." />
      </div>
      <div className="mt-2 rounded-md border border-amber-300 bg-amber-50/50 px-2 py-1.5">
        <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-amber-700 mb-0.5">Guardrails</div>
        <ul className="text-[10px] text-slate-800 space-y-0.5 leading-snug">
          <li>· Skip B4 equity sales in negative-return years.</li>
          <li>· Freeze inflation adjustment if corpus &lt; 85 % of plan.</li>
          <li>· Cut withdrawal 10 % if &lt; 70 %.</li>
        </ul>
      </div>
      <Pull source="Harry Markowitz (Nobel '90) — paraphrased">
        “Diversification is the only free lunch in finance.”
      </Pull>
      <PageFooter chapter="VI · The How" pageNum={8} />
    </PageBody>
  )
}

function RealityPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="VII · Reality Check" title="India's retirement gap." dropCap="I" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        Mercer-CFA 2025 placed India at a <strong>D-grade</strong> (45.9 / 100). Only <strong>29 %</strong> of seniors receive any pension; the rest depend on family or savings. A 60-year-old today must plan for <strong>25 – 35 years</strong> of expenses against compounding inflation.
      </p>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <StatCard tone="saffron" stat="₹5 – 7 Cr"  label="Metro household corpus" />
        <StatCard tone="rose"    stat="12 – 14 %" label="Healthcare inflation" />
        <StatCard tone="navy"    stat="90 yrs"    label="Plan-to age (95 if family)" />
        <StatCard tone="emerald" stat="CPI + 3 %" label="Real-return target" />
      </div>
      <blockquote className="font-serif italic text-[10.5px] text-amber-900 border-l-4 border-amber-500 pl-2.5 mt-2 leading-snug">
        “The first hour of work was for tomorrow, not today.” — village proverb
      </blockquote>
      <PageFooter chapter="VII · Reality" pageNum={9} />
    </PageBody>
  )
}

// ─── Spread 5 — Phases · Wisdom East ──────────────────────────────────

function PhasesPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="VIII · Two Phases" title="Two stages, two playbooks." dropCap="T" />
      <p className="font-serif text-[11px] leading-snug text-slate-800 mt-2">
        Every Indian after fifty is in one of two stages. The strategy must match the stage — mixing them is the most common error.
      </p>
      <div className="grid grid-cols-1 gap-1.5 mt-2">
        <PhaseCardCompact tone="amber"   title="Active phase"   age="50 – 65" focus="Build · accumulate · de-risk"
          pillars={['Compound in equity until 60.', 'Insure aggressively while healthy.', 'Lock SCSS the day you turn 60.']} />
        <PhaseCardCompact tone="emerald" title="Preservation" age="65 +"     focus="Withdraw · protect · simplify"
          pillars={['Four-bucket cascade for SWP.', 'Annual inflation guardrails.', 'Healthcare on autopilot.']} />
      </div>
      <Pull source="P V Subramanyam · Subramoney, 2017">
        “Time in the market beats timing the market — for the next 25 years of your retirement, this is your shield.”
      </Pull>
      <PageFooter chapter="VIII · Phases" pageNum={10} />
    </PageBody>
  )
}

function WisdomEastPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="IX · Wisdom — East" title="Voices of the East." />
      <div className="grid grid-cols-1 gap-1.5 mt-2">
        <Quote
          origin="Kauṭilya · Arthaśāstra, 4th c. BCE"
          text="“Wealth, gathered by righteous means, sustains both the giver and the receiver.”"
        />
        <Quote
          origin="Bhagavad-Gītā 2.47"
          verse="कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
          text="“Set thy heart upon thy work — never on its reward.”"
        />
        <Quote
          origin="Thiruvalluvar · Tirukkuṛaḷ 754"
          text="“Wealth without virtue is a flood without a dam.”"
        />
        <Quote
          origin="Chāṇakya · Hitopadeśa"
          verse="उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीः"
          text="“Fortune favours the diligent — never the timid who blame fate.”"
        />
        <Quote
          origin="Pattabiraman Murari · freefincal"
          text="“A modern Indian retirement corpus must last not twenty-five, but thirty-five years.”"
        />
      </div>
      <PageFooter chapter="IX · East" pageNum={11} />
    </PageBody>
  )
}

// ─── Spread 6 — Wisdom West · Mistakes ────────────────────────────────

function WisdomWestPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="X · Wisdom — West" title="Voices of the West." />
      <div className="grid grid-cols-1 gap-1.5 mt-2">
        <Quote
          origin="Warren Buffett · Berkshire 1996 letter"
          text="“Do not save what is left after spending — spend what is left after saving.”"
        />
        <Quote
          origin="Benjamin Graham · The Intelligent Investor, 1949"
          text="“The investor's chief problem — and his worst enemy — is likely to be himself.”"
        />
        <Quote
          origin="Burton G. Malkiel · A Random Walk Down Wall St., 1973"
          text="“In the short run, the market is a voting machine; in the long run, a weighing machine.”"
        />
        <Quote
          origin="Lucius Annaeus Seneca · Letters to Lucilius, 65 CE"
          text="“It is not that we have a short time to live — but that we waste much of it.”"
        />
        <Quote
          origin="Charles D. Ellis · Winning the Loser's Game, 1985"
          text="“The trick to investment success isn't winning more — it's losing less.”"
        />
      </div>
      <PageFooter chapter="X · West" pageNum={12} />
    </PageBody>
  )
}

function MistakesPage() {
  const rows = [
    { mistake: 'Treating FDs as the whole plan.',           fix: 'FD floor + bond ladder + equity refill (4-bucket).' },
    { mistake: 'Buying ULIPs / endowments for protection.', fix: 'Pure term + ELSS. Never mix insurance + investment.' },
    { mistake: 'Ignoring healthcare inflation (12 – 14 %).',fix: 'Senior-specific plan + ₹25 – 50 L super top-up at 60.' },
    { mistake: 'No will · no nominees.',                    fix: 'Registered will + nominees on every account.' },
    { mistake: 'Annuity at every cost (low real return).',  fix: 'Cap NPS annuity at 40 %. SWP from B3 for the rest.' },
  ]
  return (
    <PageBody>
      <PageHeading eyebrow="XI · Mistakes" title="Five common errors." dropCap="F" />
      <ul className="mt-1.5 space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[16px_1fr] gap-1.5 items-baseline border-b border-amber-200/60 pb-0.5 last:border-b-0">
            <span className="font-serif italic text-[13px] font-extrabold text-rose-700 tabular-nums">{i + 1}</span>
            <div>
              <div className="font-serif text-[11px] font-bold text-rose-900 leading-snug">⚠ {r.mistake}</div>
              <div className="font-serif text-[10.5px] text-emerald-900 leading-snug">✓ {r.fix}</div>
            </div>
          </li>
        ))}
      </ul>
      <PageFooter chapter="XI · Mistakes" pageNum={13} />
    </PageBody>
  )
}

// ─── Spread 7 — Action · Reflect ──────────────────────────────────────

function ActionPage() {
  const themes = [
    { tone: 'amber',   emoji: '💰', name: 'Money',   items: ['4-bucket allocation', 'Annual rebalance', 'Tax-loss harvest', '80TTB ₹50 k/yr'] },
    { tone: 'emerald', emoji: '🩺', name: 'Health',  items: ['₹25 – 50 L cover', 'Annual checkup', '8 000 steps daily'] },
    { tone: 'navy',    emoji: '⏳', name: 'Time',    items: ['1 hr weekly review', 'Spend with intention', 'Defer where possible'] },
    { tone: 'rose',    emoji: '✨', name: 'Purpose', items: ['Project beyond money', 'Volunteer monthly', 'Mentor someone'] },
  ]
  return (
    <PageBody>
      <PageHeading eyebrow="XII · Action" title="Four themes, one checklist." />
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {themes.map((t) => <ThemeCard key={t.name} {...t} />)}
      </div>
      <Pull source="Vicki Robin · Your Money or Your Life, 1992">
        “Money is something you trade your life-energy for.”
      </Pull>
      <PageFooter chapter="XII · Action" pageNum={14} />
    </PageBody>
  )
}

function ReflectPage() {
  const questions = [
    'What does a fulfilled day look like at 70?',
    'Whose life depends on the decisions I make this year?',
    'What would I regret not doing in the next decade?',
    'How much is “enough” — in numbers and feelings?',
    'If money were no object, what would I still do?',
  ]
  return (
    <PageBody>
      <PageHeading eyebrow="XIII · Reflect" title="Five questions first." dropCap="F" />
      <p className="font-serif text-[10.5px] text-slate-700 italic leading-snug mt-1.5">
        Before any number-crunching, sit with these. No wrong answers — only honest ones.
      </p>
      <ol className="mt-2 space-y-1.5">
        {questions.map((q, i) => (
          <li key={i} className="grid grid-cols-[22px_1fr] items-baseline gap-2">
            <span className="font-serif italic text-xl font-extrabold text-amber-700 tabular-nums leading-none">{i + 1}</span>
            <span className="font-serif text-[11.5px] text-slate-900 leading-snug">{q}</span>
          </li>
        ))}
      </ol>
      <Pull source="Confucius · Analects, c. 5th c. BCE">
        “The superior man thinks of justice; the small man thinks of comfort.”
      </Pull>
      <PageFooter chapter="XIII · Reflect" pageNum={15} />
    </PageBody>
  )
}

// ─── Spread 8 — Sources · End ─────────────────────────────────────────

function SourcesPage() {
  return (
    <PageBody>
      <PageHeading eyebrow="XIV · Sources" title="The working library." />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-blue-700 mb-1">Western</div>
          <ul className="text-[9.5px] text-slate-800 space-y-0.5 leading-snug">
            <li>· <em>The Four Pillars of Investing</em> — Bernstein, 2002</li>
            <li>· <em>Common Sense Investing</em> — Bogle, 2007</li>
            <li>· <em>The Intelligent Investor</em> — Graham, 1949</li>
            <li>· <em>A Random Walk Down Wall St.</em> — Malkiel, 1973</li>
            <li>· <em>Safety-First Retirement Planning</em> — Pfau, 2019</li>
            <li>· <em>The Psychology of Money</em> — Housel, 2020</li>
            <li>· <em>Winning the Loser's Game</em> — Ellis, 1985</li>
            <li>· <em>“Determining the Safe Withdrawal Rate”</em> — Bengen, JFP 1994</li>
            <li>· <em>“The Crisis in Retirement Planning”</em> — Merton, HBR 2014</li>
            <li>· <em>Your Money or Your Life</em> — Robin &amp; Dominguez, 1992</li>
          </ul>
        </div>
        <div>
          <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-amber-700 mb-1">Indian &amp; Eastern</div>
          <ul className="text-[9.5px] text-slate-800 space-y-0.5 leading-snug">
            <li>· <em>Let's Talk Money</em> — Halan, 2018</li>
            <li>· <em>Retire Rich</em> — Subramanyam, 2017</li>
            <li>· <em>Coffee Can Investing</em> — Mukherjea, 2018</li>
            <li>· <em>Value Investing &amp; Behavioral Fin.</em> — Parikh, 2003</li>
            <li>· <em>freefincal essays</em> — Pattabiraman Murari</li>
            <li>· <em>Arthaśāstra</em> — Kauṭilya, 4th c. BCE</li>
            <li>· <em>Bhagavad-Gītā</em></li>
            <li>· <em>Tirukkuṛaḷ</em> — Thiruvalluvar</li>
            <li>· <em>Hitopadeśa</em> — Chāṇakya</li>
            <li>· <em>Analects</em> — Confucius</li>
          </ul>
        </div>
      </div>
      <p className="font-serif italic text-[10px] text-slate-500 mt-2 leading-snug">
        Each citation is a doorway. Walk through the ones that speak to you.
      </p>
      <PageFooter chapter="XIV · Sources" pageNum={16} />
    </PageBody>
  )
}

function EndPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      <div className="absolute inset-4 border-2 border-amber-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-6 border border-amber-500/60 rounded-sm" aria-hidden="true" />
      <div className="relative">
        <div className="text-5xl mb-3 leading-none">🪔</div>
        <h2 className="font-serif text-2xl font-extrabold text-amber-900 leading-tight">~ End of Playbook ~</h2>
        <div className="font-serif text-3xl text-amber-800 mt-3">नमस्ते</div>
        <p className="font-serif italic text-[12px] text-slate-700 mt-4 max-w-xs mx-auto leading-snug">
          Close this book. Open your plan.
          <br />
          The years are yours to shape.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-10 bg-amber-500" />
          <span className="text-amber-700 text-sm">◆</span>
          <span className="h-px w-10 bg-amber-500" />
        </div>
      </div>
    </div>
  )
}

// ─── Content primitives (playbook-specific) ──────────────────────────

function Pull({ source, children }: { source: string; children: React.ReactNode }) {
  return (
    <figure className="mt-2 border-l-4 border-amber-500 pl-2.5 pr-1">
      <blockquote className="font-serif italic text-[10.5px] text-amber-900 leading-snug">{children}</blockquote>
      <figcaption className="text-[8.5px] text-amber-700/80 mt-0.5 tracking-wide">— {source}</figcaption>
    </figure>
  )
}

function StatCard({ tone, stat, label }: { tone: 'saffron' | 'rose' | 'navy' | 'emerald'; stat: string; label: string }) {
  const border = tone === 'saffron' ? 'border-amber-400 bg-amber-50' : tone === 'rose' ? 'border-rose-400 bg-rose-50' : tone === 'navy' ? 'border-blue-400 bg-blue-50' : 'border-emerald-400 bg-emerald-50'
  const fg = tone === 'saffron' ? 'text-amber-800' : tone === 'rose' ? 'text-rose-800' : tone === 'navy' ? 'text-blue-800' : 'text-emerald-800'
  return (
    <div className={`rounded-md border-2 ${border} px-2 py-1`}>
      <div className={`font-serif text-[15px] font-extrabold tabular-nums ${fg} leading-none`}>{stat}</div>
      <div className="text-[9.5px] text-slate-700 leading-snug mt-0.5">{label}</div>
    </div>
  )
}

function Quote({ origin, verse, text }: { origin: string; verse?: string; text: string }) {
  return (
    <figure className="rounded-md border border-amber-300 bg-white/70 px-2 py-1">
      <figcaption className="text-[8px] font-bold uppercase tracking-[1.5px] text-amber-700 mb-0.5">{origin}</figcaption>
      {verse && <p className="font-serif italic text-[10.5px] text-amber-900 leading-snug mb-0.5">{verse}</p>}
      <blockquote className="font-serif text-[10.5px] text-slate-900 leading-snug">{text}</blockquote>
    </figure>
  )
}

function PhaseCardCompact({ tone, title, age, focus, pillars }: { tone: 'amber' | 'emerald'; title: string; age: string; focus: string; pillars: string[] }) {
  const border = tone === 'amber' ? 'border-amber-400 bg-amber-50/60' : 'border-emerald-400 bg-emerald-50/60'
  const fg = tone === 'amber' ? 'text-amber-800' : 'text-emerald-800'
  return (
    <article className={`rounded-md border-2 ${border} p-1.5`}>
      <div className="flex items-baseline justify-between mb-0.5">
        <h3 className={`font-serif text-[12px] font-extrabold ${fg} leading-tight`}>{title}</h3>
        <span className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{age}</span>
      </div>
      <div className="text-[9.5px] text-slate-700 italic mb-0.5">{focus}</div>
      <ul className="text-[10px] text-slate-800 space-y-0 leading-snug">
        {pillars.map((p, i) => <li key={i}>· {p}</li>)}
      </ul>
    </article>
  )
}

function BucketCard({ tone, label, pct, body }: { tone: 'navy' | 'emerald' | 'amber' | 'rose'; label: string; pct: string; body: string }) {
  const palette: Record<string, string> = {
    navy:    'border-blue-400 bg-blue-50',
    emerald: 'border-emerald-400 bg-emerald-50',
    amber:   'border-amber-400 bg-amber-50',
    rose:    'border-rose-400 bg-rose-50',
  }
  return (
    <article className={`rounded-md border-2 ${palette[tone]} p-1.5`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-[11px] font-extrabold text-slate-900 leading-tight">{label}</h3>
        <span className="text-[9px] font-bold tabular-nums text-slate-600">{pct}</span>
      </div>
      <p className="text-[9.5px] text-slate-700 leading-snug mt-0.5">{body}</p>
    </article>
  )
}

function ThemeCard({ tone, emoji, name, items }: { tone: string; emoji: string; name: string; items: string[] }) {
  const palette: Record<string, string> = {
    amber:   'border-amber-400 bg-amber-50',
    emerald: 'border-emerald-400 bg-emerald-50',
    navy:    'border-blue-400 bg-blue-50',
    rose:    'border-rose-400 bg-rose-50',
  }
  return (
    <article className={`rounded-md border-2 ${palette[tone]} p-1.5`}>
      <div className="flex items-baseline gap-1 mb-0.5">
        <span className="text-base leading-none">{emoji}</span>
        <h3 className="font-serif text-[11.5px] font-extrabold text-slate-900 leading-tight">{name}</h3>
      </div>
      <ul className="text-[9.5px] text-slate-800 space-y-0 leading-snug">
        {items.map((it, i) => <li key={i}>· {it}</li>)}
      </ul>
    </article>
  )
}
