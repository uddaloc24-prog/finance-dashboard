import type { PlanResult, BucketKey } from '../../types/v2'
import { VerdictBadge } from './VerdictBadge'
import { FundList } from './FundList'
import { Button } from '../ui/Button'

interface PlanRevealProps {
  plan: PlanResult
  onReset: () => void
}

const BUCKETS: BucketKey[] = ['b1', 'b2', 'b3', 'b4']

const bucketColor: Record<BucketKey, string> = {
  b1: 'bg-blue-400',
  b2: 'bg-teal-400',
  b3: 'bg-violet-400',
  b4: 'bg-orange-400',
}

export function PlanReveal({ plan, onReset }: PlanRevealProps) {
  const firstYear = plan.projection[0]
  const lastYear = plan.projection[plan.projection.length - 1]
  const totalInitial =
    plan.initialBuckets.b1 + plan.initialBuckets.b2 + plan.initialBuckets.b3 + plan.initialBuckets.b4

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Your retirement plan</h2>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Start over
          </Button>
        </div>

        <VerdictBadge kind={plan.verdict.kind} headline={plan.verdict.headline} />

        {plan.verdict.gap && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-900 mb-2">The gap</h3>
            <div className="grid grid-cols-2 gap-3">
              {plan.verdict.gap.shortfallCorpus > 0 && (
                <Metric
                  label="Corpus shortfall"
                  value={`₹${formatShort(plan.verdict.gap.shortfallCorpus)}`}
                />
              )}
              {plan.verdict.gap.alternativeMonthly > 0 && (
                <Metric
                  label="Sustainable monthly"
                  value={`₹${formatShort(plan.verdict.gap.alternativeMonthly)}`}
                />
              )}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {plan.verdict.kind === 'achievable' ? 'Why it works' : 'Why we say that'}
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-700 list-disc pl-5">
            {plan.verdict.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        {plan.verdict.adjustments && plan.verdict.adjustments.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">Try this</h3>
            <ul className="space-y-3">
              {plan.verdict.adjustments.map((adj, i) => (
                <li key={i} className="text-sm">
                  <div className="font-medium text-amber-900">{adj.change}</div>
                  <div className="text-amber-800 text-xs mt-0.5">→ {adj.outcome}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Allocation —{' '}
            <span className="font-normal text-gray-500 capitalize">{plan.strategy} strategy</span>
          </h3>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
            {BUCKETS.map((b) => (
              <div
                key={b}
                className={bucketColor[b]}
                style={{ width: `${plan.allocation[b] * 100}%` }}
                aria-label={`${b.toUpperCase()} ${Math.round(plan.allocation[b] * 100)}%`}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {BUCKETS.map((b) => (
              <div key={b} className="text-xs">
                <div className={`inline-block w-2.5 h-2.5 rounded-full ${bucketColor[b]}`} />
                <div className="text-gray-900 font-medium mt-0.5">
                  {Math.round(plan.allocation[b] * 100)}%
                </div>
                <div className="text-gray-500">
                  ₹{formatShort(plan.initialBuckets[b])}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-gray-500 text-center">
            Total corpus deployed: ₹{formatShort(totalInitial)}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Recommended funds</h3>
          {BUCKETS.map((b) => (
            <FundList key={b} bucket={b} picks={plan.fundPicks[b]} />
          ))}
          <p className="text-[11px] text-gray-500 text-center">
            All funds cross-checked against the AMFI master list.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">25-year projection</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric
              label="Year 1 corpus"
              value={`₹${formatShort(firstYear?.totalCorpus ?? 0)}`}
            />
            <Metric
              label="Year 25 corpus"
              value={`₹${formatShort(lastYear?.totalCorpus ?? 0)}`}
            />
            <Metric
              label="Year 1 withdrawal"
              value={`₹${formatShort(firstYear?.annualWithdrawal ?? 0)}/yr`}
            />
            <Metric
              label="Year 25 withdrawal"
              value={`₹${formatShort(lastYear?.annualWithdrawal ?? 0)}/yr`}
            />
          </div>
        </section>

        <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Assumptions
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-600 list-disc pl-5">
            <li>Allocation: 10 / 35 / 25 / 30 (Liquidity / Fixed Floor / Stability / Growth) — paper baseline</li>
            <li>Expected returns: B1 6.5% · B2 8.5% · B3 10% · B4 13% (nominal)</li>
            <li>General inflation: 6.5% per year</li>
            <li>Draw order: B1 → B3 → B4. B2 is a 5-year FD/SCSS ladder — held to maturity, never drawn or refilled.</li>
            <li>Refill: B4 → B3 (interest harvest, skipped on losing years), then B3 → B1 (2-year buffer top-up).</li>
            <li>Guardrails: freeze inflation on the draw when corpus dips below 85% of starting; cut draw 10% below 70%.</li>
            <li>Stress test: 35% one-time equity crash in year 5 — verdict factors in whether the plan recovers.</li>
            <li>LTCG: ₹1.25 L annual exemption, remainder taxed at 12.5% (FY 2024-25)</li>
            <li>Return bands shown are mid ± 15% (low / mid / high)</li>
            <li>Plan generated: {new Date(plan.generatedAt).toLocaleString('en-IN')}</li>
          </ul>
        </details>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  )
}

function formatShort(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`
  return n.toLocaleString('en-IN')
}
