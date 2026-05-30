// glidePath — per-goal equity decay curve from today → target year.
//
// PDF reference (Goal-Based Investing §II.B.7): "Glide Path Investing —
// reduce equity with time. Example: 20 y away → 70 % · 10 y → 50 % ·
// 5 y → 30 %."
//
// Fit
// ───
// We model the equity share as a convex power curve:
//
//     E(t)  =  E_floor  +  (E_init − E_floor) × (t / T) ^ p
//
//   t       — years remaining to target (0 at target, T at today)
//   T       — initial years to target
//   E_init  — equity share at today's allocation (b3 + b4 of the
//             strategy-aware Phase-5 blend)
//   E_floor — defensive floor at target — chosen per goal kind:
//             income → 0.15 · event → 0.25 · corpus-build → 0.35
//             legacy → 0.40 (legacy stays growth-tilted to outpace inflation)
//   p = 0.7 — convex exponent; equity stays high longer, drops sharply
//             near the target. Calibrated against the PDF's three example
//             points (see test).
//
// Bucket reshape preserves the strategy's debt:debt and equity:equity
// internal ratios, so a "Liability-Driven" goal keeps its B1 / B2 mix
// even as the defensive share grows.
//
// Pure function · deterministic.

import type {
  EngineInput, RawGoal, GlidePoint,
} from '../../types/orchestration'
import type { Strategy } from './strategyCatalogue'

const CONVEX_EXPONENT = 0.7

const E_FLOOR_BY_KIND: Record<RawGoal['kind'], number> = {
  income:         0.15,
  event:          0.25,
  'corpus-build': 0.35,
  legacy:         0.40,
}

type Buckets = { b1: number; b2: number; b3: number; b4: number }

interface GlidePathArgs {
  goal: RawGoal
  input: EngineInput
  strategy: Strategy | undefined          // recommended strategy from selector
  initialBuckets: Buckets                 // Phase-5 strategy-aware blend
}

export function buildGlidePath({ goal, input, strategy, initialBuckets }: GlidePathArgs): GlidePoint[] {
  // No glide if strategy is static — caller decides what to do with [].
  if (!strategy?.allocation.glideDown) return []

  const currentYear = input.plan.currentYear
  const targetYear  = goal.startYear ?? currentYear + 5
  const T = Math.max(0.5, targetYear - currentYear)
  if (T < 1) return []

  // Endpoints
  const eInit = round(initialBuckets.b3 + initialBuckets.b4, 4)
  const eFloor = E_FLOOR_BY_KIND[goal.kind] ?? 0.30
  // Don't glide UPWARD: if today's equity is already at or below the floor,
  // return a flat single-point series (will be picked up by the UI as
  // "already defensive enough").
  if (eInit <= eFloor + 1e-6) {
    return [snapshot(currentYear, T, initialBuckets)]
  }

  // Internal ratios — preserve across the glide.
  const defInit = initialBuckets.b1 + initialBuckets.b2
  const eqInit  = initialBuckets.b3 + initialBuckets.b4
  const b1Frac = defInit > 0 ? initialBuckets.b1 / defInit : 0.20
  const b2Frac = defInit > 0 ? initialBuckets.b2 / defInit : 0.80
  const b3Frac = eqInit  > 0 ? initialBuckets.b3 / eqInit  : 0.40
  const b4Frac = eqInit  > 0 ? initialBuckets.b4 / eqInit  : 0.60

  // Sample density: yearly for short horizons, every 2 years up to 20 y,
  // every 5 y otherwise. Always include today and target year.
  const years = sampleYears(currentYear, targetYear)

  return years.map((y) => {
    const t = Math.max(0, targetYear - y)
    const equity = eFloor + (eInit - eFloor) * Math.pow(t / T, CONVEX_EXPONENT)
    const defensive = 1 - equity
    const buckets: Buckets = {
      b1: round(defensive * b1Frac, 4),
      b2: round(defensive * b2Frac, 4),
      b3: round(equity    * b3Frac, 4),
      b4: round(equity    * b4Frac, 4),
    }
    // Final renormalisation against any rounding drift.
    return snapshot(y, t, normalise(buckets))
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────

function snapshot(year: number, yearsToTarget: number, b: Buckets): GlidePoint {
  return {
    year,
    yearsToTarget: round(yearsToTarget, 2),
    equityShare: round(b.b3 + b.b4, 4),
    buckets: b,
  }
}

function sampleYears(start: number, end: number): number[] {
  const horizon = end - start
  const step = horizon <= 10 ? 1 : horizon <= 20 ? 2 : 5
  const out: number[] = []
  for (let y = start; y < end; y += step) out.push(y)
  if (out[out.length - 1] !== end) out.push(end)
  return out
}

function normalise(b: Buckets): Buckets {
  const sum = b.b1 + b.b2 + b.b3 + b.b4
  if (sum <= 0) return { b1: 1, b2: 0, b3: 0, b4: 0 }
  return {
    b1: round(b.b1 / sum, 4),
    b2: round(b.b2 / sum, 4),
    b3: round(b.b3 / sum, 4),
    b4: round(b.b4 / sum, 4),
  }
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d); return Math.round(v * f) / f
}
