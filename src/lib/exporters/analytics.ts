// Shared analytics computation used by all export formats. Runs the
// strategy comparison, stress test, Monte Carlo, and tax engine on the
// user's inputs and returns a single bundle that each exporter consumes.

import type { ExportContext } from './index'
import type { TaxRegime, TaxSlab } from '../calculations/taxEngine'
import { ageFromDOB } from '../../types/identity'
import { totalCorpus } from '../calculations'
import { runAllStrategies } from '../calculations/strategyEngine'
import { runMonteCarlo } from '../calculations/monteCarlo'
import { runCrashStressTest, simulateRefillLinked } from '../refillStrategy'
import { profileById } from '../data/riskProfiles'
import { storage } from '../storage'
import { computePostTax, classifyInstrument } from '../calculations/taxEngine'

export function buildAnalytics(ctx: ExportContext) {
  const total = totalCorpus(ctx.buckets)
  const monthly = ctx.profile.monthlyWithdrawal
  const annual = monthly * 12
  const wr = total > 0 ? (annual / total) * 100 : 0
  const isSenior = (ctx.profile.demographics?.currentAge ?? ageFromDOB(ctx.identity?.dateOfBirth) ?? 60) >= 60
  const slab: TaxSlab = (ctx.profile.taxBracket ?? 20) as TaxSlab
  const regime: TaxRegime = 'old'

  const strategies = runAllStrategies({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    buckets: ctx.buckets,
    taxSlab: slab, taxRegime: regime, isSenior,
  })
  const bestFit = strategies.find((s) => s.isBestFit) ?? strategies[0]

  const stress = runCrashStressTest({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    allocation: ctx.profile.bucketAllocation ?? { b1: 0.10, b2: 0.20, b3: 0.25, b4: 0.45 },
    returnAssumptions: ctx.returnAssumptions,
    inflationRate: ctx.profile.inflationRate,
  })

  const mc = runMonteCarlo({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    buckets: ctx.buckets,
    runs: 200,
  })

  const projection25 = simulateRefillLinked({
    buckets: ctx.buckets,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    initialCorpus: ctx.profile.corpus,
    horizonYears: 25,
  })

  const riskProfileId = storage.getRiskProfile()
  const riskProfile = riskProfileId ? profileById(riskProfileId) : null

  const scale = ctx.profile.corpus / 1_00_00_000
  const incomeMix = (riskProfile?.instruments ?? [])
    .filter((i) => i.monthlyIncomeOn1Cr && i.monthlyIncomeOn1Cr > 0)
    .map((i) => ({
      monthly: (i.monthlyIncomeOn1Cr ?? 0) * scale,
      taxClass: classifyInstrument(i.category, i.bucket),
    }))
  const postTax = incomeMix.length > 0
    ? computePostTax(incomeMix, { slab, regime, isSenior, ltcgUsedThisYear: 0 })
    : null

  return {
    total, monthly, annual, wr, isSenior, slab, regime,
    strategies, bestFit, stress, mc, projection25,
    riskProfile, postTax,
  }
}

export type AnalyticsBundle = ReturnType<typeof buildAnalytics>

// ── Shared formatters ───────────────────────────────────────────────

export const fmtINR = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return '₹0'
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

export function fileSlugFor(ctx: ExportContext): string {
  const raw = (ctx.identity?.fullName ?? 'user').trim().toLowerCase()
  return raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'user'
}

export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
