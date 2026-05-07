// Indian Retirement Welcome — namaskar hero, quote collage, two-phase journey,
// mistake/solution matrix, and a four-theme action checklist. Content synthesized
// from the Indian Retirement Playbook (FY 2025–26) plus the Two-Phase and
// Exhaustive Strategy Matrix briefs.

import { type ReactNode } from 'react'

interface Props {
  onStart?: () => void
}

export function RetirementWelcome({ onStart }: Props) {
  return (
    <article className="bg-gradient-to-b from-amber-50/40 via-white to-emerald-50/30">
      <NamaskarHero onStart={onStart} />

      <Divider />

      {/* The reality check — 4 stat cards */}
      <Section eyebrow="The reality check" title={<>India's <em className="not-italic font-extrabold text-amber-700">retirement gap</em></>}>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
          India scored a <strong>D-grade</strong> on the Mercer-CFA Global Pension Index 2025 (45.9 / 100).
          Only <strong>29%</strong> of seniors receive any pension. Joint families are shrinking,
          healthcare inflation runs at 12–14 %, and a 60-year-old today must plan for
          <strong> 25–35 years</strong> of expenses with rising costs every year.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat tone="saffron" stat="₹5–7 Cr" label="What a metro household typically needs" />
          <Stat tone="rose"    stat="12–14%"  label="India healthcare inflation per year" />
          <Stat tone="navy"    stat="90 yrs"  label="Plan to age 90 — outliving savings is the real risk" />
          <Stat tone="emerald" stat="CPI + 3%" label="Real-return target — beats FD-only by miles" />
        </div>
      </Section>

      <Divider />

      {/* Quote collage — wisdom on money, time, purpose */}
      <Section eyebrow="A few words to begin" title={<>Wisdom across <em className="not-italic font-extrabold text-blue-700">cultures and ages</em></>}>
        <QuoteCollage />
      </Section>

      <Divider />

      {/* Two-phase journey */}
      <Section eyebrow="The two phases" title={<>Two stages, <em className="not-italic font-extrabold text-emerald-700">two playbooks</em></>}>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
          Every Indian after 50 is in one of two stages. The strategy must match the stage —
          mixing them is the most common error.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PhaseCard
            phase="Phase 1"
            tone="rose"
            title="The Red Zone"
            ageRange="Age 50–60"
            focus="Accelerate savings, clear liabilities, build the safety net"
            illustration={<DiyaIllustration />}
            pillars={[
              { icon: '⚡', text: 'Front-load EPF / VPF / NPS contributions' },
              { icon: '🏠', text: 'Zero-debt milestone by age 55, hard limit at 58' },
              { icon: '🩺', text: 'Personal health insurance + Super Top-up before 55' },
              { icon: '⚖️', text: 'Registered Will + aligned nominations + joint-holding' },
              { icon: '🛡️', text: 'MWP Act insurance — creditor-proof shield for spouse' },
            ]}
          />
          <PhaseCard
            phase="Phase 2"
            tone="emerald"
            title="The Distribution Phase"
            ageRange="Age 60+"
            focus="Tax-efficient withdrawals, capital preservation, estate handover"
            illustration={<BanyanIllustration />}
            pillars={[
              { icon: '🪣', text: 'Three-bucket cashflow: liquid · income · growth' },
              { icon: '📈', text: 'SWP from BAFs in the "Go-Go" years to grow principal' },
              { icon: '🧾', text: 'Section 80TTB ₹50k + Form 15H to stop unnecessary TDS' },
              { icon: '✂️', text: 'Annual ₹1.25L LTCG harvest — tax-free reset' },
              { icon: '🔐', text: 'Safe-Bank rule — sober bank for corpus, transactional for spend' },
            ]}
          />
        </div>
      </Section>

      <Divider />

      {/* Mistake → Global → Indian matrix */}
      <Section
        eyebrow="The three-lens matrix"
        title={<>Common <em className="not-italic font-extrabold text-rose-700">mistakes</em>, world-class <em className="not-italic font-extrabold text-amber-700">fixes</em>, Indian <em className="not-italic font-extrabold text-emerald-700">recipes</em></>}
      >
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
          Every row pairs a frequent error with the global wealth-management gold-standard,
          then translates it into the specific Indian instrument or rule that delivers the same outcome.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {MATRIX.map((row) => <MatrixCard key={row.area} row={row} />)}
        </div>
      </Section>

      <Divider />

      {/* The 4-theme action checklist */}
      <Section eyebrow="The action checklist" title={<>Four themes, <em className="not-italic font-extrabold text-amber-700">one master list</em></>}>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
          The single Master Folder of moves that separates a stress-free retirement from a fragile one.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THEMES.map((t) => <ThemeCard key={t.title} theme={t} />)}
        </div>
      </Section>

      <Divider />

      {/* Five questions */}
      <Section eyebrow="Beyond money" title={<>The <em className="not-italic font-extrabold text-emerald-700">five questions</em> to answer first</>}>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
          Money is the foundation. Purpose, relationships, health, and meaning are the house.
          Answer these <strong>before</strong> you retire.
        </p>
        <div className="relative bg-gradient-to-br from-emerald-50 via-white to-amber-50 rounded-2xl border-2 border-emerald-300 ring-1 ring-inset ring-emerald-100 p-4 sm:p-6 overflow-hidden">
          <LotusOrnament className="absolute -top-6 -right-6 opacity-20" size={120} />
          <ol className="space-y-3 relative">
            {QUESTIONS.map((q, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white font-serif text-base font-extralight tabular-nums flex items-center justify-center mt-0.5 shadow-sm">
                  {i + 1}
                </span>
                <p className="text-[13px] sm:text-sm text-slate-800 leading-relaxed flex-1 pt-1">{q}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Closing */}
      <footer className="mt-12 pt-8 border-t-2 border-slate-900 relative">
        <SunburstOrnament className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-20" size={140} />
        <div className="text-center max-w-2xl mx-auto relative">
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-3">The goal</div>
          <blockquote className="font-serif text-xl sm:text-2xl font-extralight italic text-slate-900 leading-snug">
            "The goal isn't to die with the most money.<br />
            <em className="not-italic font-extrabold text-amber-700">The goal is to die with the most life.</em>"
          </blockquote>
          <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
            Plan your finances so money is never the reason you don't live fully — then go live fully.
          </p>
          {onStart && (
            <button
              type="button"
              onClick={onStart}
              className="mt-7 inline-flex items-center gap-2 px-8 py-3 rounded-md bg-blue-700 text-white text-sm font-bold shadow-sm hover:bg-blue-800 transition-colors"
            >
              Begin your plan →
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}

// ── Namaskar hero ────────────────────────────────────────────────────

function NamaskarHero({ onStart }: { onStart?: () => void }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border-[3px] border-amber-400 ring-1 ring-inset ring-amber-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-12 sm:px-10 sm:py-16 text-center shadow-lg">
      {/* Tricolor strip — saffron · white · green */}
      <div className="absolute top-0 left-0 right-0 h-1 flex" aria-hidden="true">
        <span className="flex-1 bg-amber-500" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-emerald-600" />
      </div>

      {/* Background — sun rays + concentric mandalas */}
      <SunburstOrnament className="absolute inset-0 m-auto w-full h-full opacity-30" size={520} />

      {/* Lotus corner ornaments */}
      <LotusOrnament className="absolute top-6 left-6 opacity-30 hidden sm:block" size={60} />
      <LotusOrnament className="absolute top-6 right-6 opacity-30 hidden sm:block" size={60} />

      {/* Diya pair near bottom */}
      <div className="absolute bottom-6 left-8 opacity-40 hidden md:block" aria-hidden="true">
        <DiyaSmall size={42} />
      </div>
      <div className="absolute bottom-6 right-8 opacity-40 hidden md:block" aria-hidden="true">
        <DiyaSmall size={42} />
      </div>

      {/* Om symbol */}
      <div className="relative font-serif text-3xl sm:text-4xl text-amber-700 leading-none mb-2" aria-hidden="true">
        ॐ
      </div>

      {/* Namaskar — large emoji as the focal gesture */}
      <div className="relative text-7xl sm:text-8xl mb-3 leading-none drop-shadow-sm" role="img" aria-label="Namaskar — folded hands greeting">
        🙏
      </div>

      {/* Devanagari greeting */}
      <h1 className="relative font-serif text-4xl sm:text-5xl font-extralight tracking-tight text-amber-800 mb-1.5 leading-none">
        नमस्ते
      </h1>
      <div className="relative text-[10px] sm:text-xs font-bold tracking-[5px] uppercase text-emerald-700 mb-4">
        Namaste · Welcome · स्वागतम्
      </div>

      {/* Tagline */}
      <h2 className="relative font-serif text-xl sm:text-2xl lg:text-3xl font-extralight tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
        The Indian Retirement &amp; <em className="not-italic font-extrabold text-amber-700">Goal-Setting Playbook</em>
      </h2>
      <p className="relative text-xs sm:text-sm text-slate-600 mt-2.5 max-w-2xl mx-auto leading-relaxed">
        A world-class master document for Indians aged 50+ — built on global wealth-management standards
        and calibrated for India's tax laws, culture, and markets.
        Updated <strong className="text-slate-800">FY&nbsp;2025–26</strong>.
      </p>

      {/* Decorative tricolor divider */}
      <div className="relative mt-6 flex items-center justify-center gap-3">
        <span className="h-px w-14 bg-amber-500/60" aria-hidden="true" />
        <span className="text-amber-700 text-lg" aria-hidden="true">◆</span>
        <span className="h-px w-14 bg-emerald-600/60" aria-hidden="true" />
      </div>

      {/* CTA */}
      {onStart && (
        <button
          type="button"
          onClick={onStart}
          className="relative mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-md bg-amber-600 text-white text-sm font-bold shadow-md hover:bg-amber-700 hover:shadow-lg transition-all"
        >
          Begin your plan →
        </button>
      )}
    </header>
  )
}

// ── Quote collage ────────────────────────────────────────────────────

interface Quote {
  text: string
  author: string
  tone: Tone
  size: 'sm' | 'md' | 'lg'
  rotate: number
  italic?: boolean
  serif?: boolean
}

const QUOTES: Quote[] = [
  { text: 'The goal isn\'t to die with the most money. The goal is to die with the most life.', author: 'Bill Perkins, "Die With Zero"', tone: 'saffron', size: 'lg', rotate: -1.5, italic: true, serif: true },
  { text: 'Don\'t simply retire from something; have something to retire to.', author: 'Harry Emerson Fosdick', tone: 'emerald', size: 'md', rotate: 2 },
  { text: 'धैर्यं सर्वार्थसाधनम्', author: 'Patience is the means to every goal — Sanskrit', tone: 'navy', size: 'md', rotate: -2.5, serif: true },
  { text: 'Plan for the long life. Hope for the short trip.', author: 'Jonathan Clements', tone: 'rose', size: 'sm', rotate: 1.5, italic: true },
  { text: 'Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn\'t, pays it.', author: 'Albert Einstein', tone: 'navy', size: 'md', rotate: 1, italic: true, serif: true },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese proverb', tone: 'emerald', size: 'sm', rotate: -1 },
  { text: 'Retirement is wonderful if you have two essentials — much to live on, and much to live for.', author: 'Anonymous', tone: 'amber', size: 'md', rotate: 2.5, serif: true },
  { text: 'वसुधैव कुटुम्बकम्', author: 'The world is one family — Maha Upanishad', tone: 'saffron', size: 'sm', rotate: -2, serif: true },
  { text: 'Time is more valuable than money. You can get more money, but you cannot get more time.', author: 'Jim Rohn', tone: 'rose', size: 'md', rotate: -1, italic: true },
  { text: 'The question isn\'t at what age I want to retire — it\'s at what income.', author: 'George Foreman', tone: 'amber', size: 'sm', rotate: 1.5 },
]

function QuoteCollage() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
      {QUOTES.map((q, i) => <QuoteCard key={i} quote={q} />)}
    </div>
  )
}

function QuoteCard({ quote }: { quote: Quote }) {
  const t = TONES[quote.tone]
  const sizeClass =
    quote.size === 'lg' ? 'text-lg sm:text-xl py-5 px-5' :
    quote.size === 'md' ? 'text-sm sm:text-base py-4 px-4' :
    'text-xs sm:text-sm py-3 px-3.5'
  const fontClass = [
    quote.serif ? 'font-serif' : 'font-sans',
    quote.italic ? 'italic' : '',
  ].join(' ')

  return (
    <figure
      className={`relative break-inside-avoid mb-4 rounded-xl bg-white border-2 ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
      style={{ transform: `rotate(${quote.rotate}deg)` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${t.bar}`} aria-hidden="true" />
      <span className={`absolute top-1.5 left-2 font-serif text-3xl ${t.text} opacity-40 leading-none select-none`} aria-hidden="true">
        "
      </span>
      <blockquote className={`${sizeClass} ${fontClass} relative`}>
        <p className="text-slate-800 leading-snug">{quote.text}</p>
        <figcaption className={`mt-2 text-[10px] font-bold tracking-[1.5px] uppercase ${t.text} not-italic`}>
          — {quote.author}
        </figcaption>
      </blockquote>
    </figure>
  )
}

// ── Phase card ───────────────────────────────────────────────────────

interface PhaseCardData {
  phase: string
  tone: Tone
  title: string
  ageRange: string
  focus: string
  illustration: ReactNode
  pillars: Array<{ icon: string; text: string }>
}

function PhaseCard({ phase, tone, title, ageRange, focus, illustration, pillars }: PhaseCardData) {
  const t = TONES[tone]
  return (
    <section className={`relative rounded-2xl bg-white border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
      <header className={`relative px-5 pt-6 pb-4 ${t.bg} border-b-2 border-slate-100 overflow-hidden`}>
        <div className="absolute right-2 top-2 opacity-60" aria-hidden="true">{illustration}</div>
        <div className="relative">
          <div className={`text-[10px] font-bold tracking-[3px] uppercase ${t.text} mb-1`}>{phase} · {ageRange}</div>
          <h3 className="font-serif text-2xl font-extralight tracking-tight text-slate-900 leading-tight">{title}</h3>
          <p className="text-[12px] text-slate-600 mt-1 leading-snug max-w-md">{focus}</p>
        </div>
      </header>
      <ul className="px-5 py-4 space-y-2.5">
        {pillars.map((p, i) => (
          <li key={i} className="flex gap-2.5 items-start">
            <span className="shrink-0 text-base mt-0.5" aria-hidden="true">{p.icon}</span>
            <span className="text-[12px] text-slate-700 leading-snug">{p.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Mistake/Solution matrix ──────────────────────────────────────────

interface MatrixRow {
  area: string
  icon: string
  mistake: string
  global: string
  indian: string
}

const MATRIX: MatrixRow[] = [
  {
    area: 'Catch-up phase',
    icon: '⚡',
    mistake: 'Plateauing SIPs in your 50s despite peak earnings.',
    global: 'Front-load every legal catch-up contribution.',
    indian: 'Maximise VPF (8.25% EPF rate) + NPS 80CCD(1B) ₹50k.',
  },
  {
    area: 'Mortgage exit',
    icon: '🏠',
    mistake: 'Holding the home loan for the Section 24 tax break.',
    global: 'The "Zero-Debt" milestone — 100% debt-free by 55.',
    indian: 'Direct every LTA / bonus / variable-pay to home-loan principal.',
  },
  {
    area: 'Health cover',
    icon: '🩺',
    mistake: 'Old policies with room-rent caps cause proportionate deductions.',
    global: 'Switch to no-limit indemnity with zero sub-limits.',
    indian: 'Port to a Comprehensive plan + add a ₹50L Super Top-up.',
  },
  {
    area: 'Concentration risk',
    icon: '🎯',
    mistake: 'ESOPs / one property hold 30–40% of net worth.',
    global: 'The 10% Cap rule — no single asset above 10%.',
    indian: 'Phase ESOPs into Nifty index funds + SGBs over 12–18 months.',
  },
  {
    area: 'Cashflow strategy',
    icon: '💸',
    mistake: 'Fixed spending mindset ignoring the U-shape of expenses.',
    global: 'Model the Spending Smile Curve — high-low-high.',
    indian: 'Bucket SWP from BAFs in the Go-Go years; principal keeps growing.',
  },
  {
    area: 'Tax efficiency',
    icon: '🧾',
    mistake: 'Draining taxable accounts first; pushed into a higher slab.',
    global: 'Tax-bracket management across pots.',
    indian: 'Section 80TTB ₹50k + Form 15H + ₹1.25L LTCG harvesting yearly.',
  },
  {
    area: 'Estate succession',
    icon: '⚖️',
    mistake: 'No Will. Nominee mistaken as legal owner. Probate eats years.',
    global: 'Living Trust + unified estate plan, all aligned.',
    indian: 'Registered Will + Video Will + Either-or-Survivor on every asset.',
  },
  {
    area: 'Cyber security',
    icon: '🔐',
    mistake: 'OTP / KYC phishing scams targeting seniors.',
    global: 'Zero-trust protocol; hardware security keys.',
    indian: 'Safe-Bank rule — sober bank for corpus, transactional bank for spend.',
  },
  {
    area: 'Social pressures',
    icon: '🛡️',
    mistake: 'Funding child\'s wedding / business from retirement corpus.',
    global: 'Explicit financial-boundary setting.',
    indian: 'Oxygen Mask Rule + MWP Act insurance shield + capped Helping Fund.',
  },
]

function MatrixCard({ row }: { row: MatrixRow }) {
  return (
    <article className="relative rounded-xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <header className="px-3.5 py-2.5 bg-slate-50 border-b-2 border-slate-100 flex items-center gap-2">
        <span className="text-base" aria-hidden="true">{row.icon}</span>
        <h4 className="text-[13px] font-bold tracking-tight text-slate-900">{row.area}</h4>
      </header>
      <div className="divide-y divide-slate-100">
        <div className="px-3.5 py-2.5 flex gap-2 items-start bg-rose-50/40">
          <span className="shrink-0 w-5 h-5 rounded bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-bold flex items-center justify-center" aria-hidden="true">✗</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-rose-700">Mistake</div>
            <p className="text-[11px] text-slate-700 leading-snug mt-0.5">{row.mistake}</p>
          </div>
        </div>
        <div className="px-3.5 py-2.5 flex gap-2 items-start bg-amber-50/40">
          <span className="shrink-0 w-5 h-5 rounded bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold flex items-center justify-center" aria-hidden="true">★</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-amber-700">Global gold-standard</div>
            <p className="text-[11px] text-slate-700 leading-snug mt-0.5">{row.global}</p>
          </div>
        </div>
        <div className="px-3.5 py-2.5 flex gap-2 items-start bg-emerald-50/40">
          <span className="shrink-0 w-5 h-5 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-bold flex items-center justify-center" aria-hidden="true">✓</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-emerald-700">Indian recipe</div>
            <p className="text-[11px] text-slate-700 leading-snug mt-0.5">{row.indian}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Action checklist themes ──────────────────────────────────────────

interface Theme {
  num: string
  title: string
  desc: string
  tone: Tone
  icon: string
  items: string[]
}

const THEMES: Theme[] = [
  {
    num: '01', title: 'Administrative & Legal', desc: 'Do this first — paperwork that protects everything else',
    tone: 'navy', icon: '📁',
    items: [
      'Convert every bank account, locker, MF folio to "Either or Survivor"',
      'Audit PAN / Aadhaar / bank — names must match exactly to avoid inheritance freezes',
      'Draft + register your Will. Add a video Will on your phone for evidence of intent',
      'Build the "Master Folder" — Will, deeds, policies, account list (physical + DigiLocker)',
      'Submit Form 15H to every bank on April 1st each year — stops needless TDS',
    ],
  },
  {
    num: '02', title: 'Investment & Tax Strategy', desc: 'Compound the corpus, harvest the tax breaks',
    tone: 'saffron', icon: '📈',
    items: [
      'The 50/50 Increment Rule — half of every hike or bonus goes to retirement first',
      'Annual ₹1.25L LTCG harvest — sell-and-rebuy equity MFs every Jan–March',
      'Spousal income splitting — gift to non-working spouse for separate ₹50k 80TTB',
      'Start STP at age 57 — phase from equity to BAF / debt before retirement',
      'Use Equity Savings Funds for tax-efficient yield above FD rates',
    ],
  },
  {
    num: '03', title: 'Healthcare & Debt', desc: 'The medical fortress, the debt-free milestone',
    tone: 'rose', icon: '🩺',
    items: [
      'Personal health insurance + ₹50L Super Top-up — buy by age 54 while healthy',
      'Critical Illness Lump-Sum cover = 2 years of annual income',
      'Long-Term Care fund — sinking fund for home-nursing or assisted living',
      'Schedule every EMI to hit zero at least 24 months before retirement',
      'Ayushman Bharat PM-JAY enrolment on the day you turn 70 (free ₹5L cover)',
    ],
  },
  {
    num: '04', title: 'Technology & Security', desc: 'Safe-Bank rule + digital legacy',
    tone: 'emerald', icon: '🔐',
    items: [
      'Two-bank setup — Safe Bank (no app, no card) + Transactional Bank (app, UPI)',
      'Load DigiLocker with all critical certificates and share access with executor',
      'Password manager — store master password in physical bank locker, not digital',
      'Enable Legacy Contact / Inactive Account Manager on Apple + Google',
      'Save 1930 (National Cyber Crime Helpline) on every family phone',
    ],
  },
]

function ThemeCard({ theme }: { theme: Theme }) {
  const t = TONES[theme.tone]
  return (
    <section className={`relative rounded-2xl bg-white border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
      <header className={`flex items-start gap-3 px-4 pt-5 pb-3 border-b-2 border-slate-100 ${t.bg}`}>
        <span
          className={`shrink-0 w-10 h-10 rounded-md ${t.numBg} ${t.text} font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${t.numBorder}`}
          aria-hidden="true"
        >
          {theme.num}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`flex items-baseline gap-1.5 ${t.text}`}>
            <span className="text-[10px] font-bold tracking-[2px] uppercase">Theme {parseInt(theme.num, 10)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-base" aria-hidden="true">{theme.icon}</span>
          </div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 leading-tight">{theme.title}</h3>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{theme.desc}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-500 bg-white border border-slate-200 rounded-md px-1.5 py-0.5">
          {theme.items.length}
        </span>
      </header>
      <ul className="flex-1 px-4 py-3 space-y-2">
        {theme.items.map((item, i) => (
          <li key={i} className="flex gap-2.5 items-start text-[12px] text-slate-700 leading-snug">
            <span className={`shrink-0 w-4 h-4 rounded-full border-2 ${t.numBorder} bg-white mt-0.5`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Layout primitives ────────────────────────────────────────────────

function Section({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <div className="flex items-baseline gap-3 mb-1.5">
          <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">{eyebrow}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-tight text-slate-900 leading-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Divider() {
  return (
    <div className="my-12 flex items-center justify-center gap-4 opacity-70" aria-hidden="true">
      <span className="h-px flex-1 max-w-[8rem] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/60" />
      <PaisleyOrnament size={36} />
      <span className="h-px flex-1 max-w-[8rem] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/60" />
    </div>
  )
}

function Stat({ stat, label, tone }: { stat: string; label: string; tone: Tone }) {
  const t = TONES[tone]
  return (
    <div className={`relative rounded-xl bg-white border-2 ${t.border} ring-1 ring-inset ${t.ring} px-3 py-3 overflow-hidden shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${t.bar}`} aria-hidden="true" />
      <div className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${t.text} leading-none`}>{stat}</div>
      <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">{label}</p>
    </div>
  )
}

const QUESTIONS = [
  'What will I do with my first free Tuesday morning? — Not a holiday. The real test.',
  'Who are the 3–5 non-family people I\'ll call this week purely for connection?',
  'What am I learning right now that is completely outside my professional domain?',
  'What contribution will outlive me? — Mentoring, philanthropy, community, creative work.',
  'What does my spouse want their retirement to look like? Have the conversation now.',
]

// ── SVG ornaments ────────────────────────────────────────────────────

function LotusOrnament({ className, size = 80 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {/* Outer petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse
          key={i}
          cx="50" cy="22" rx="8" ry="22"
          fill="#FF9933"
          opacity="0.65"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
      {/* Inner petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse
          key={i}
          cx="50" cy="32" rx="5" ry="14"
          fill="#FFB347"
          opacity="0.85"
          transform={`rotate(${i * 45 + 22.5} 50 50)`}
        />
      ))}
      {/* Center */}
      <circle cx="50" cy="50" r="6" fill="#138808" />
      <circle cx="50" cy="50" r="3" fill="#FFD700" />
    </svg>
  )
}

function SunburstOrnament({ className, size = 200 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 400 400" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="rwSunGrad2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB347" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#FF9933" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF9933" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#rwSunGrad2)" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="200" y1="200" x2="200" y2="40"
          stroke="#FF9933"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${(i * 360) / 24} 200 200)`}
          opacity={0.6}
        />
      ))}
      {/* Mandala rings */}
      <circle cx="200" cy="200" r="160" fill="none" stroke="#138808" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
      <circle cx="200" cy="200" r="125" fill="none" stroke="#FF9933" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
      <circle cx="200" cy="200" r="90" fill="none" stroke="#138808" strokeWidth="0.5" opacity="0.5" />
      {/* Inner mandala dots */}
      {Array.from({ length: 16 }).map((_, i) => (
        <circle
          key={i}
          cx="200"
          cy="80"
          r="2"
          fill="#FF9933"
          opacity="0.7"
          transform={`rotate(${(i * 360) / 16} 200 200)`}
        />
      ))}
    </svg>
  )
}

function PaisleyOrnament({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      {/* Stylized paisley / boteh */}
      <path
        d="M 15 50 Q 5 30 15 15 Q 25 5 35 10 Q 50 15 45 30 Q 42 40 32 42 Q 22 44 20 35 Q 18 28 25 25"
        fill="none"
        stroke="#FF9933"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="30" r="2" fill="#138808" />
      <circle cx="20" cy="32" r="1.2" fill="#FF9933" opacity="0.7" />
      <circle cx="38" cy="22" r="1.2" fill="#138808" opacity="0.7" />
    </svg>
  )
}

function DiyaIllustration({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {/* Flame */}
      <path d="M 50 15 Q 45 25 50 35 Q 55 25 50 15 Z" fill="#FF9933" />
      <path d="M 50 22 Q 47 28 50 33 Q 53 28 50 22 Z" fill="#FFD700" />
      {/* Diya bowl */}
      <ellipse cx="50" cy="55" rx="30" ry="6" fill="#8B4513" opacity="0.4" />
      <path d="M 22 55 Q 50 75 78 55 L 76 60 Q 50 78 24 60 Z" fill="#A0522D" />
      <ellipse cx="50" cy="55" rx="28" ry="4" fill="#D2691E" />
      {/* Glow rays */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="50" y1="25"
          x2="50" y2="5"
          stroke="#FFD700"
          strokeWidth="1"
          opacity="0.5"
          strokeLinecap="round"
          transform={`rotate(${(i - 3.5) * 12} 50 25)`}
        />
      ))}
    </svg>
  )
}

function DiyaSmall({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden="true">
      <path d="M 25 8 Q 22 14 25 20 Q 28 14 25 8 Z" fill="#FF9933" />
      <path d="M 12 28 Q 25 38 38 28 L 36 31 Q 25 39 14 31 Z" fill="#A0522D" />
      <ellipse cx="25" cy="28" rx="13" ry="2" fill="#D2691E" />
    </svg>
  )
}

function BanyanIllustration({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {/* Banyan canopy — multiple overlapping circles */}
      <circle cx="50" cy="35" r="22" fill="#138808" opacity="0.55" />
      <circle cx="35" cy="40" r="14" fill="#138808" opacity="0.65" />
      <circle cx="65" cy="40" r="14" fill="#138808" opacity="0.65" />
      <circle cx="50" cy="28" r="12" fill="#1FA017" opacity="0.7" />
      {/* Trunk */}
      <rect x="46" y="45" width="8" height="32" fill="#8B4513" />
      {/* Hanging roots */}
      <line x1="35" y1="48" x2="35" y2="68" stroke="#8B4513" strokeWidth="1" opacity="0.7" />
      <line x1="40" y1="50" x2="40" y2="65" stroke="#8B4513" strokeWidth="1" opacity="0.7" />
      <line x1="60" y1="50" x2="60" y2="66" stroke="#8B4513" strokeWidth="1" opacity="0.7" />
      <line x1="65" y1="48" x2="65" y2="70" stroke="#8B4513" strokeWidth="1" opacity="0.7" />
      {/* Ground */}
      <ellipse cx="50" cy="80" rx="36" ry="3" fill="#138808" opacity="0.3" />
    </svg>
  )
}

// ── Tone tokens ──────────────────────────────────────────────────────

type Tone = 'saffron' | 'rose' | 'emerald' | 'navy' | 'amber'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string; numBorder: string
}> = {
  saffron: { border: 'border-amber-400',   ring: 'ring-amber-100',    bar: 'bg-amber-600',     text: 'text-amber-700',   bg: 'bg-amber-50/60',   numBg: 'bg-amber-50',    numBorder: 'border-amber-300' },
  amber:   { border: 'border-yellow-400',  ring: 'ring-yellow-100',   bar: 'bg-yellow-600',    text: 'text-yellow-700',  bg: 'bg-yellow-50/60',  numBg: 'bg-yellow-50',   numBorder: 'border-yellow-300' },
  rose:    { border: 'border-rose-400',    ring: 'ring-rose-100',     bar: 'bg-rose-600',      text: 'text-rose-700',    bg: 'bg-rose-50/60',    numBg: 'bg-rose-50',     numBorder: 'border-rose-300' },
  emerald: { border: 'border-emerald-400', ring: 'ring-emerald-100',  bar: 'bg-emerald-600',   text: 'text-emerald-700', bg: 'bg-emerald-50/60', numBg: 'bg-emerald-50',  numBorder: 'border-emerald-300' },
  navy:    { border: 'border-blue-400',    ring: 'ring-blue-100',     bar: 'bg-blue-700',      text: 'text-blue-700',    bg: 'bg-blue-50/60',    numBg: 'bg-blue-50',     numBorder: 'border-blue-300' },
}
