// biasProfile — distil a structured behavioural-bias profile from the
// v10 composites (money scripts + bias / scam / acquiescence indices)
// and the Goal-Discovery secondary persona. Used by Phase 3+ to filter
// strategies on the PDF's "Behavioural Stability" and "Behavioural
// Strategies" branches.
//
// The four money scripts (Klontz et al., 2011) are projected into five
// downstream bias dimensions via a fixed transition matrix — decision
// theory, not learning. Pure function, deterministic. Same signal in →
// byte-identical profile out.
//
// Calibration notes
// ─────────────────
// • Lossaversion ← avoidance (.6) + vigilance (.3) + status (.1)
//     Avoidance scripts are the canonical loss-averse pattern; vigilant
//     savers are partially loss-averse; status-driven users are only
//     marginally so (they fear the loss of status, not corpus per se).
//
// • Present bias ← worship (.5) + status (.3) + (1 − vigilance) (.2)
//     Worship + status scripts both pull spending forward; low vigilance
//     correlates with poor planning horizons.
//
// • Status seeking ≡ status (direct).
//
// • Herding ← status (.4) + worship (.4) + (1 − vigilance) (.2)
//     Mirrors "fashion-driven" investing behaviour.
//
// • Overconfidence ← v10.biasIndex direct (already a composite).
//
// Confidence: 0.4 base + 0.3 if money scripts present + 0.3 if v10
// completed.

import type {
  BiasProfile, BehaviouralGuardrail,
} from '../../types/orchestration'
import type {
  V10QuizState, GoalDiscoveryState, MoneyScriptId,
} from '../../types/psychometric'

// ─── Coefficients (locked; see header comment for rationale) ──────────

const COEF = {
  lossAversion:  { avoidance: 0.6, vigilance: 0.3, status: 0.1, worship: 0.0 },
  presentBias:   { worship:   0.5, status:    0.3, antiVigilance: 0.2 },
  herding:       { status:    0.4, worship:   0.4, antiVigilance: 0.2 },
} as const

const ZERO_SCRIPTS: Record<MoneyScriptId, number> = {
  avoidance: 0, worship: 0, status: 0, vigilance: 0,
}

// ─── Main entry ───────────────────────────────────────────────────────

export function deriveBiasProfile(
  v10: V10QuizState | null,
  gd: GoalDiscoveryState | null,
): BiasProfile {
  const composites = v10?.composites ?? null
  const rawScripts = composites?.moneyScripts ?? null

  const scripts = normaliseScripts(rawScripts)
  const dominantScript = composites?.dominantMoneyScript ?? null

  // Signals
  const lossAversion = 100 * (
    COEF.lossAversion.avoidance * scripts.avoidance +
    COEF.lossAversion.vigilance * scripts.vigilance +
    COEF.lossAversion.status    * scripts.status
  )
  const presentBias = 100 * (
    COEF.presentBias.worship * scripts.worship +
    COEF.presentBias.status  * scripts.status  +
    COEF.presentBias.antiVigilance * (1 - scripts.vigilance)
  )
  const statusSeeking = 100 * scripts.status
  const herding = 100 * (
    COEF.herding.status * scripts.status +
    COEF.herding.worship * scripts.worship +
    COEF.herding.antiVigilance * (1 - scripts.vigilance)
  )
  const overconfidence    = composites?.biasIndex ?? 50
  const scamVulnerability = composites?.scamVulnerability ?? 50
  const acquiescence      = composites?.acquiescenceIndex ?? 50

  const signals = {
    lossAversion:      round(clamp01x100(lossAversion), 1),
    presentBias:       round(clamp01x100(presentBias), 1),
    statusSeeking:     round(clamp01x100(statusSeeking), 1),
    herding:           round(clamp01x100(herding), 1),
    overconfidence:    round(clamp01x100(overconfidence), 1),
    scamVulnerability: round(clamp01x100(scamVulnerability), 1),
    acquiescence:      round(clamp01x100(acquiescence), 1),
  }

  const guardrails = buildGuardrails(signals)

  // Confidence: 0.4 base + 0.3 if scripts present + 0.3 if v10 completed
  let confidence = 0.4
  if (rawScripts && Object.keys(rawScripts).length > 0) confidence += 0.3
  if (v10?.completed)                                   confidence += 0.3
  // Secondary persona from GD lifts confidence very slightly
  if (gd?.inference?.persona?.secondary)                confidence += 0.05

  return {
    scripts,
    dominantScript,
    signals,
    guardrails,
    confidence: round(Math.min(1, confidence), 3),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Normalise raw money-script numbers to a probability simplex (∑ = 1).
 *  Falls back to a flat 0.25 each when no data is available. */
function normaliseScripts(raw: Record<MoneyScriptId, number> | null): Record<MoneyScriptId, number> {
  if (!raw) return { ...ZERO_SCRIPTS, avoidance: 0.25, worship: 0.25, status: 0.25, vigilance: 0.25 }
  const v = (k: MoneyScriptId) => Math.max(0, Number.isFinite(raw[k]) ? raw[k] : 0)
  const sum = v('avoidance') + v('worship') + v('status') + v('vigilance')
  if (sum <= 0) return { avoidance: 0.25, worship: 0.25, status: 0.25, vigilance: 0.25 }
  return {
    avoidance: round(v('avoidance') / sum, 4),
    worship:   round(v('worship')   / sum, 4),
    status:    round(v('status')    / sum, 4),
    vigilance: round(v('vigilance') / sum, 4),
  }
}

/** Build guardrail list from signal levels (PDF §II.H — Behavioural). */
function buildGuardrails(s: BiasProfile['signals']): BehaviouralGuardrail[] {
  const out: BehaviouralGuardrail[] = []
  if (s.lossAversion >= 70) {
    out.push({
      id: 'sip-freeze-on-drawdown',
      category: 'sip-freeze',
      trigger: 'Portfolio drops more than 10 % in a quarter',
      action: 'Freeze all SIP cuts / pauses for 30 days; require dual confirmation to act',
      severity: 'high',
    })
  }
  if (s.presentBias >= 70) {
    out.push({
      id: 'commit-auto-debit',
      category: 'commitment',
      trigger: 'Goal corpus shortfall > 15 %',
      action: 'Lock SIPs on auto-debit; review only at quarter-end, not weekly',
      severity: 'high',
    })
  }
  if (s.statusSeeking >= 70) {
    out.push({
      id: 'concentration-cap',
      category: 'rebalance-cap',
      trigger: 'Any single stock > 8 % of portfolio',
      action: 'Force trim to ≤ 5 %; deploy core-satellite cap instead of free buying',
      severity: 'med',
    })
  }
  if (s.overconfidence >= 70) {
    out.push({
      id: 'tactical-cap',
      category: 'rebalance-cap',
      trigger: 'Tactical deviation from strategic allocation > 10 % in a year',
      action: 'Hard-cap deviation at ±10 %; revert excess at next rebalance',
      severity: 'med',
    })
  }
  if (s.scamVulnerability >= 60) {
    out.push({
      id: 'cooling-off',
      category: 'commitment',
      trigger: 'New product / advisor added to plan',
      action: 'Require 7-day cooling-off before first investment; whitelist payment institutions',
      severity: 'high',
    })
  }
  if (s.acquiescence >= 70) {
    out.push({
      id: 'requiz-acquiescence',
      category: 'flag',
      trigger: 'Quiz scores may be inflated by yea-saying',
      action: 'Re-take the deep risk quiz before acting on a higher-risk strategy',
      severity: 'low',
    })
  }
  if (s.herding >= 70) {
    out.push({
      id: 'review-cadence',
      category: 'review-cadence',
      trigger: 'Headline-driven allocation change request',
      action: 'Restrict allocation changes to quarterly review cycles only',
      severity: 'med',
    })
  }
  return out
}

function clamp01x100(v: number): number {
  return Math.min(100, Math.max(0, v))
}
function round(v: number, d: number): number {
  const f = Math.pow(10, d); return Math.round(v * f) / f
}
