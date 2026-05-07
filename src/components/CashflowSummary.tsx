// CashflowSummary — reads the user's monthly withdrawal need and passive-income
// schedule, computes the net cashflow position, and suggests how to deploy any
// surplus into SIP / RD instruments according to the chosen risk profile.
//
// When passive income ≥ withdrawal: corpus is preserved (or grown) and the
// surplus is deployed into market vehicles. When passive income < withdrawal:
// only the shortfall is drawn from corpus.

import type { UserProfile, BucketState } from '../types'
import { totalCorpus } from '../lib/calculations'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return INR(n)
}

// Surplus-deployment recommendation per risk-appetite slot (1 = Ultra-Conservative,
// 5 = Aggressive / FIRE). The split mirrors the bucket allocation philosophy in
// the academic 4-bucket paper — debt-heavy at low risk, equity-heavy at high risk.
interface Allocation {
  sipPct: number
  rdPct: number
  sipVehicle: string
  rdVehicle: string
  profileLabel: string
}

const SURPLUS_ALLOCATIONS: Record<1 | 2 | 3 | 4 | 5, Allocation> = {
  1: { sipPct: 0,  rdPct: 100, sipVehicle: '—',                          rdVehicle: 'Recurring Deposit / SCSS top-up',     profileLabel: 'Ultra-Conservative' },
  2: { sipPct: 30, rdPct: 70,  sipVehicle: 'Aggressive Hybrid Fund SIP', rdVehicle: 'Recurring Deposit / Debt MF',         profileLabel: 'Conservative' },
  3: { sipPct: 50, rdPct: 50,  sipVehicle: 'Balanced Advantage Fund SIP', rdVehicle: 'Short-duration Debt MF',             profileLabel: 'Moderate' },
  4: { sipPct: 70, rdPct: 30,  sipVehicle: 'Flexi-Cap Equity Fund SIP',  rdVehicle: 'Banking & PSU Debt MF',               profileLabel: 'Moderately Aggressive' },
  5: { sipPct: 90, rdPct: 10,  sipVehicle: 'Mid-Cap / Multi-Cap SIP',    rdVehicle: 'Liquid / Arbitrage Fund',             profileLabel: 'Aggressive / FIRE' },
}

interface Props {
  profile: UserProfile
  buckets: BucketState
}

export function CashflowSummary({ profile, buckets }: Props) {
  const withdrawal = profile.monthlyWithdrawal
  const income = profile.sipAmount
  const net = income - withdrawal
  const surplus = net > 0
  const balanced = net === 0 && withdrawal > 0
  const deficit = net < 0
  const effectiveDraw = Math.max(0, withdrawal - income)
  const corpus = totalCorpus(buckets)
  const annualIncome = income * 12
  const totalBase = corpus + annualIncome

  const alloc = SURPLUS_ALLOCATIONS[(profile.riskAppetite as 1 | 2 | 3 | 4 | 5) ?? 3]
  const sipAmount = surplus ? Math.round(net * alloc.sipPct / 100) : 0
  const rdAmount  = surplus ? Math.round(net * alloc.rdPct  / 100) : 0
  const effectiveAnnualDraw = effectiveDraw * 12
  const wr = corpus > 0 ? (effectiveAnnualDraw / corpus) * 100 : 0

  // ── Empty state ─────────────────────────────────────────────────
  if (withdrawal === 0 && income === 0) {
    return (
      <section className="relative bg-white rounded-xl border-[3px] border-slate-300 ring-1 ring-inset ring-slate-100 overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500" aria-hidden="true" />
        <header className="flex items-center gap-3 px-4 sm:px-5 pt-5 pb-3 border-b-2 border-slate-100">
          <span className="shrink-0 w-10 h-10 rounded-md bg-slate-50 text-slate-600 font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 border-slate-300">
            05
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-0.5">Section 5</div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">Cashflow Summary</h2>
          </div>
        </header>
        <div className="p-4 sm:p-5 text-center">
          <p className="text-sm text-slate-600 leading-snug max-w-md mx-auto">
            Enter your <strong className="text-slate-900">Monthly Budget</strong> and{' '}
            <strong className="text-slate-900">SIP / Passive Income</strong> above to see your cashflow position
            and a personalised surplus-deployment plan.
          </p>
        </div>
      </section>
    )
  }

  // Tone selection drives the tone-bordered card colour
  const tone =
    surplus ? { border: 'border-emerald-400', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-100', numBorder: 'border-emerald-300' } :
    balanced ? { border: 'border-blue-400', bar: 'bg-blue-600', text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-100', numBorder: 'border-blue-300' } :
    { border: 'border-amber-400', bar: 'bg-amber-600', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-100', numBorder: 'border-amber-300' }

  return (
    <section className={`relative bg-white rounded-xl border-[3px] ${tone.border} ring-1 ring-inset ${tone.ring} overflow-hidden shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${tone.bar}`} aria-hidden="true" />
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-5 pb-3 border-b-2 border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 w-10 h-10 rounded-md ${tone.bg} ${tone.text} font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${tone.numBorder}`}>
            05
          </span>
          <div className="min-w-0">
            <div className={`text-[10px] font-bold tracking-[2px] uppercase ${tone.text} mb-0.5`}>Section 5</div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">Cashflow Summary</h2>
            <div className="text-[11px] text-slate-500 leading-snug truncate">
              Withdrawal vs passive income · personalised surplus plan
            </div>
          </div>
        </div>
        <div
          className={[
            'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[1.5px] border',
            surplus ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
            balanced ? 'bg-blue-50 border-blue-300 text-blue-700' :
            'bg-amber-50 border-amber-300 text-amber-700',
          ].join(' ')}
        >
          {surplus ? '✓ Surplus' : balanced ? '= Balanced' : '⚠ Deficit'}
        </div>
      </header>

      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Three KPI cells */}
        <div className="grid grid-cols-3 gap-2">
          <KpiCell label="Withdrawal" value={INR(withdrawal)} sub="per month" valueClass="text-slate-900" />
          <KpiCell label="Passive income" value={INR(income)} sub="per month" valueClass="text-slate-900" />
          <KpiCell
            label="Net cashflow"
            value={(net >= 0 ? '+' : '−') + INR(Math.abs(net))}
            sub="per month"
            valueClass={surplus ? 'text-emerald-700' : balanced ? 'text-blue-700' : 'text-amber-700'}
          />
        </div>

        {/* Verdict line */}
        <div
          className={[
            'rounded-lg border-2 px-3 py-2.5',
            surplus ? 'bg-emerald-50 border-emerald-200' :
            balanced ? 'bg-blue-50 border-blue-200' :
            'bg-amber-50 border-amber-200',
          ].join(' ')}
        >
          {surplus && (
            <>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                Income covers expenses with <span className="text-emerald-700">{INR(net)}/mo</span> left over.
              </div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Corpus draws nothing — keep growing it from market returns and the surplus deployment below.
              </div>
            </>
          )}
          {balanced && (
            <>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                Income exactly covers expenses.
              </div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Corpus draws nothing. Inflation erosion will slowly create a deficit unless income rises with prices.
              </div>
            </>
          )}
          {deficit && (
            <>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                Corpus funds a <span className="text-amber-700">{INR(effectiveDraw)}/mo</span> shortfall.
              </div>
              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                Effective annual draw <strong className="text-slate-800 tabular-nums">{INR(effectiveAnnualDraw)}</strong>{' '}
                · Withdrawal rate <strong className="text-slate-800 tabular-nums">{wr.toFixed(2)}%</strong> · Below 4% is conservative; 4–5% is moderate; &gt;6% is fragile.
              </div>
            </>
          )}
        </div>

        {/* Source = corpus + passive income */}
        <div className="rounded-lg bg-slate-50 border-2 border-slate-200 px-3 py-2.5">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1.5">Funding source</div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Corpus</div>
              <div className="text-sm font-extrabold text-slate-900 tabular-nums leading-tight">{CR(corpus)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">+ Annual income</div>
              <div className="text-sm font-extrabold text-slate-900 tabular-nums leading-tight">{CR(annualIncome)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">= 1-yr base</div>
              <div className={`text-sm font-extrabold tabular-nums leading-tight ${tone.text}`}>{CR(totalBase)}</div>
            </div>
          </div>
        </div>

        {/* Surplus deployment */}
        {surplus && net > 0 && (
          <div className="rounded-lg border-2 border-emerald-300 ring-1 ring-emerald-100 ring-inset bg-white p-3.5">
            <div className="flex items-baseline justify-between gap-2 mb-2.5 flex-wrap">
              <div>
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-700">Suggested deployment</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹{net.toLocaleString('en-IN')}/mo across SIP & RD
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-emerald-700">Profile</span>
                <span className="text-[11px] font-bold text-slate-900">{alloc.profileLabel}</span>
                <span className="text-[10px] text-slate-500 tabular-nums">({profile.riskAppetite}/5)</span>
              </div>
            </div>

            {/* Allocation bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-2.5">
              <div className="bg-emerald-500" style={{ width: `${alloc.sipPct}%` }} aria-label={`SIP ${alloc.sipPct}%`} />
              <div className="bg-blue-500" style={{ width: `${alloc.rdPct}%` }} aria-label={`RD ${alloc.rdPct}%`} />
            </div>

            {/* SIP + RD detail rows */}
            <div className="space-y-2">
              <DeployRow
                pct={alloc.sipPct}
                amount={sipAmount}
                kind="SIP"
                vehicle={alloc.sipVehicle}
                tone="emerald"
              />
              <DeployRow
                pct={alloc.rdPct}
                amount={rdAmount}
                kind="RD"
                vehicle={alloc.rdVehicle}
                tone="blue"
              />
            </div>

            <p className="text-[10px] text-slate-500 mt-2.5 italic leading-snug">
              Suggested split — not a recommendation. Validate with a SEBI-registered advisor before opening accounts.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function KpiCell({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg px-2.5 py-2 text-center">
      <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-slate-500">{label}</div>
      <div className={`text-base sm:text-lg font-extrabold tabular-nums leading-tight mt-0.5 ${valueClass ?? 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-400 tabular-nums">{sub}</div>}
    </div>
  )
}

function DeployRow({
  pct, amount, kind, vehicle, tone,
}: {
  pct: number
  amount: number
  kind: 'SIP' | 'RD'
  vehicle: string
  tone: 'emerald' | 'blue'
}) {
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
  const text = tone === 'emerald' ? 'text-emerald-700' : 'text-blue-700'
  if (pct === 0) return null
  return (
    <div className="flex items-center gap-2.5">
      <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-[1.5px] ${text}`}>{kind}</span>
          <span className="text-[9px] text-slate-500 tabular-nums">{pct}%</span>
        </div>
        <div className="text-[11px] text-slate-700 leading-tight truncate" title={vehicle}>{vehicle}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-extrabold text-slate-900 tabular-nums">₹{amount.toLocaleString('en-IN')}</div>
        <div className="text-[9px] text-slate-500">/month</div>
      </div>
    </div>
  )
}
