import type {
  PlanRequest,
  PlanResponse,
  PlanResult,
  FundPick,
  BucketKey,
  ReturnRange,
  AIVerdict,
  VerdictKind,
} from '../src/types/v2'
import type { SWPYearRow } from '../src/types'
import { curatedFundsByBucket } from '../src/constants/curatedFunds'
import { allocateBuckets } from '../src/lib/calculations'
import {
  simulateRefillLinked,
  b3SufficiencyYears,
  findMaxSustainableMonthly,
  findMinViableCorpus,
  runCrashStressTest,
  type StressTestResult,
} from '../src/lib/refillStrategy'
import {
  BUCKET_ALLOCATION,
  DEFAULT_RETURN_ASSUMPTIONS,
  B4_HARVEST_TRIGGER_PCT,
  B4_HARVEST_PCT,
  B3_SUFFICIENCY_YEARS,
  SWP_YEARS,
  GUARDRAIL_FREEZE_THRESHOLD,
  GUARDRAIL_CUT_THRESHOLD,
} from '../src/constants'

export const config = { runtime: 'edge' }

const INFLATION_RATE = 6.5
const DEFAULT_MONTHLY = 60_000

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: PlanRequest
  try {
    body = (await req.json()) as PlanRequest
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { corpus, goals, overrides } = body
  const allocation = overrides?.allocation ?? BUCKET_ALLOCATION
  const buckets = allocateBuckets(corpus, allocation)
  const monthlyWithdrawal = goals.find((g) => g.kind === 'income')?.amount ?? DEFAULT_MONTHLY

  const projection = simulateRefillLinked({
    buckets,
    monthlyWithdrawal,
    inflationRate: INFLATION_RATE,
    returnAssumptions: DEFAULT_RETURN_ASSUMPTIONS,
    initialCorpus: corpus,
  })

  const stress = runCrashStressTest({
    corpus,
    monthlyWithdrawal,
    allocation,
    returnAssumptions: DEFAULT_RETURN_ASSUMPTIONS,
    inflationRate: INFLATION_RATE,
  })

  const fundPicks = pickFromCuratedShortlist()
  const returnRanges = buildReturnRanges(projection.map((r) => r.totalCorpus))
  const verdict = evaluateVerdict({ corpus, monthlyWithdrawal, allocation, projection, stress })

  const plan: PlanResult = {
    strategy: 'cascade',
    allocation,
    initialBuckets: buckets,
    fundPicks,
    verdict,
    projection,
    returnRanges,
    generatedAt: new Date().toISOString(),
  }

  const res: PlanResponse = { plan, provider: 'fallback', cachedAmfiAt: null }

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function evaluateVerdict(args: {
  corpus: number
  monthlyWithdrawal: number
  allocation: { b1: number; b2: number; b3: number; b4: number }
  projection: SWPYearRow[]
  stress: StressTestResult
}): AIVerdict {
  const { corpus, monthlyWithdrawal, allocation, projection, stress } = args
  const horizon = SWP_YEARS

  const depleted = projection.length < horizon || projection.some((r) => r.totalCorpus <= 0)
  const anyShortfall = projection.some((r) => (r.shortfall ?? 0) > 0)
  const dipsBelowInitial = projection.some((r) => r.corpusBelowInitial)
  const finalCorpus = projection[projection.length - 1]?.totalCorpus ?? 0
  const initialCover = b3SufficiencyYears(
    corpus * allocation.b3,
    monthlyWithdrawal * 12,
    DEFAULT_RETURN_ASSUMPTIONS.b3,
  )

  const altMonthly = findMaxSustainableMonthly({
    corpus,
    allocation,
    returnAssumptions: DEFAULT_RETURN_ASSUMPTIONS,
    inflationRate: INFLATION_RATE,
    horizonYears: horizon,
  })

  const baselineFails = depleted || anyShortfall
  // Crash failure: baseline succeeds but stress test breaks.
  const crashFragile = !baselineFails && !stress.resilient

  const kind: VerdictKind = baselineFails
    ? 'not-achievable'
    : dipsBelowInitial || crashFragile
      ? 'achievable-with-adjustments'
      : 'achievable'

  const taxLine = `Tax: LTCG on B4 harvests uses the ₹1.25 L annual exemption, remainder taxed at 12.5% (FY 2024-25).`
  const refillLine = `Refill chain: B4 → B3 (when B4 returns ≥ ${B4_HARVEST_TRIGGER_PCT}%, harvest ${Math.round(B4_HARVEST_PCT * 100)}% of gain, or when B3 cover < ${B3_SUFFICIENCY_YEARS} years), then B3 → B1 (top up B1 to a 2-year liquidity buffer). B2 is a 5-year fixed-deposit ladder — held to maturity, untouched. Equity harvests skip any year where B4 returns ≤ 0% (no selling at a loss). Draw order: B1 → B3 → B4.`
  const guardrailLine = `Guardrails: if corpus dips below ${Math.round(GUARDRAIL_FREEZE_THRESHOLD * 100)}% of starting, inflation increase is frozen; below ${Math.round(GUARDRAIL_CUT_THRESHOLD * 100)}%, withdrawals are also cut by 10% to ride out the drawdown.`
  const allocLine = `Starting corpus: ₹${formatCrore(corpus)} allocated ${Math.round(allocation.b1 * 100)}/${Math.round(allocation.b2 * 100)}/${Math.round(allocation.b3 * 100)}/${Math.round(allocation.b4 * 100)} across Liquidity / Fixed Floor / Stability / Growth.`
  const stressLine = stress.resilient
    ? `Stress test (${stress.scenarioLabel}): plan recovers — final corpus ₹${formatCrore(stress.finalCorpus)}.`
    : `Stress test (${stress.scenarioLabel}): plan ${stress.brokeAtYear ? `breaks at year ${stress.brokeAtYear}` : `ends at ₹${formatCrore(stress.finalCorpus)}, below the safety floor`}.`

  if (kind === 'achievable') {
    return {
      kind,
      headline: `Yes — ₹${formatMonthly(monthlyWithdrawal)}/month is sustainable for ${horizon} years, even through a 30-40% equity crash.`,
      explanation: [
        allocLine,
        `Final corpus at year ${horizon}: ₹${formatCrore(finalCorpus)} — corpus stays at or above the starting value every year.`,
        `SWP draws from B3 (hybrid/BAF/REIT) — initial cover ≈ ${initialCover.toFixed(1)} years without any refill.`,
        stressLine,
        guardrailLine,
        refillLine,
        taxLine,
      ],
    }
  }

  if (kind === 'achievable-with-adjustments') {
    const lowest = projection.reduce(
      (m, r) => (r.totalCorpus < m.totalCorpus ? r : m),
      projection[0],
    )
    const adjustments: AIVerdict['adjustments'] = []
    if (altMonthly > 0 && altMonthly < monthlyWithdrawal) {
      adjustments.push({
        change: `Reduce monthly withdrawal to ₹${formatMonthly(altMonthly)}`,
        outcome: `Corpus stays at or above the starting ₹${formatCrore(corpus)} every year for the full ${horizon}-year horizon.`,
      })
    }
    if (crashFragile) {
      adjustments.push({
        change: `Shift 5% of corpus from B4 (Growth) to B2 (Fixed Floor)`,
        outcome: `Strengthens the buffer — ${stress.scenarioLabel} no longer breaks the plan.`,
      })
    }
    const baselineHeadline = dipsBelowInitial
      ? `Close — baseline works, but corpus dips to ₹${formatCrore(lowest.totalCorpus)} in year ${lowest.year}.`
      : `Close — baseline holds, but a ${stress.scenarioLabel} ${stress.brokeAtYear ? `breaks the plan at year ${stress.brokeAtYear}` : 'leaves the plan thin'}.`
    return {
      kind,
      headline: baselineHeadline,
      explanation: [
        allocLine,
        `Baseline: completes the ${horizon}-year horizon without depleting — final corpus ₹${formatCrore(finalCorpus)}.`,
        dipsBelowInitial
          ? `Lowest point in baseline: year ${lowest.year} at ₹${formatCrore(lowest.totalCorpus)} — B4 harvests catch up later.`
          : `Baseline corpus stays above the starting value throughout.`,
        stressLine,
        guardrailLine,
        refillLine,
        taxLine,
      ],
      adjustments: adjustments.length ? adjustments : undefined,
    }
  }

  // not-achievable
  const failYear =
    projection.length < horizon
      ? projection.length + 1
      : (projection.find((r) => (r.shortfall ?? 0) > 0)?.year ?? horizon)

  const requiredCorpus = findMinViableCorpus({
    monthlyWithdrawal,
    allocation,
    returnAssumptions: DEFAULT_RETURN_ASSUMPTIONS,
    inflationRate: INFLATION_RATE,
    horizonYears: horizon,
    startCorpus: corpus,
  })
  const shortfallCorpus = Number.isFinite(requiredCorpus) ? Math.max(0, requiredCorpus - corpus) : 0

  const adjustments: AIVerdict['adjustments'] = []
  if (altMonthly > 0) {
    adjustments.push({
      change: `Hold ₹${formatMonthly(altMonthly)}/month instead of ₹${formatMonthly(monthlyWithdrawal)}`,
      outcome: `Plan sustains for the full ${horizon}-year horizon on the existing ₹${formatCrore(corpus)} corpus.`,
    })
  }
  if (Number.isFinite(requiredCorpus) && shortfallCorpus > 0) {
    adjustments.push({
      change: `Boost corpus by ₹${formatCrore(shortfallCorpus)} (target: ₹${formatCrore(requiredCorpus)})`,
      outcome: `₹${formatMonthly(monthlyWithdrawal)}/month becomes sustainable, even through a ${stress.scenarioLabel}.`,
    })
  }

  return {
    kind,
    headline: `₹${formatMonthly(monthlyWithdrawal)}/month isn't sustainable on a ₹${formatCrore(corpus)} corpus.`,
    explanation: [
      allocLine,
      projection.length < horizon
        ? `Corpus runs out around year ${failYear} of the ${horizon}-year horizon — even before any market crash.`
        : `Withdrawals fall short starting year ${failYear} — the plan can't keep up with inflation-adjusted draws.`,
      altMonthly > 0
        ? `Max sustainable draw on the current corpus: ₹${formatMonthly(altMonthly)}/month.`
        : `Even modest withdrawals deplete the current corpus.`,
      stressLine,
      guardrailLine,
      taxLine,
    ],
    gap: { shortfallCorpus, alternativeMonthly: altMonthly },
    adjustments: adjustments.length ? adjustments : undefined,
  }
}

function pickFromCuratedShortlist(): Record<BucketKey, FundPick[]> {
  const byBucket = curatedFundsByBucket()
  const out: Record<BucketKey, FundPick[]> = { b1: [], b2: [], b3: [], b4: [] }
  for (const b of ['b1', 'b2', 'b3', 'b4'] as const) {
    const top = byBucket[b].slice(0, 2)
    out[b] = top.map((fund, i) => ({
      schemeCode: fund.schemeCode,
      schemeName: fund.schemeName,
      nav: 0,
      oneYearReturn: null,
      threeYearReturn: null,
      suggestedAllocation: i === 0 ? 60 : 40,
      rationale: `${fund.category} fund, AUM ~₹${fund.aumCrore?.toLocaleString('en-IN')} Cr, expense ratio ${fund.expenseRatio}%.`,
    }))
  }
  return out
}

function buildReturnRanges(mids: number[]): ReturnRange[] {
  return mids.map((mid, idx) => ({
    year: idx + 1,
    low: Math.round(mid * 0.85),
    mid: Math.round(mid),
    high: Math.round(mid * 1.15),
  }))
}

function formatCrore(n: number): string {
  if (!Number.isFinite(n)) return '∞'
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`
  return n.toLocaleString('en-IN')
}

function formatMonthly(n: number): string {
  return n.toLocaleString('en-IN')
}
