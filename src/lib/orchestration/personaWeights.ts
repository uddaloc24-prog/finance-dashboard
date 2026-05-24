// Persona-keyed criterion weights for the Goal Ranking Engine.
// Locked by design memo §5 on 2026-05-24. Each row sums to 1.0.
// User overrides (Preferences.weightOverrides) re-normalise on merge.

import type { PersonaId } from '../../types/psychometric'
import type { CriterionWeights } from '../../types/orchestration'

/** P1-P9 default weight vectors + a neutral fallback. Sums verified == 1.0. */
export const PERSONA_WEIGHTS: Record<PersonaId | 'default', CriterionWeights> = {
  P1: { importance: 0.20, urgency: 0.20, affordability: 0.40, riskFit: 0.20 }, // Security Seeker
  P2: { importance: 0.40, urgency: 0.20, affordability: 0.25, riskFit: 0.15 }, // Status Builder
  P3: { importance: 0.20, urgency: 0.15, affordability: 0.40, riskFit: 0.25 }, // Cautious Saver
  P4: { importance: 0.40, urgency: 0.25, affordability: 0.20, riskFit: 0.15 }, // Aspirational Investor
  P5: { importance: 0.25, urgency: 0.25, affordability: 0.25, riskFit: 0.25 }, // Balanced Planner
  P6: { importance: 0.30, urgency: 0.35, affordability: 0.20, riskFit: 0.15 }, // Goal Hunter
  P7: { importance: 0.35, urgency: 0.10, affordability: 0.25, riskFit: 0.30 }, // Builder
  P8: { importance: 0.20, urgency: 0.15, affordability: 0.40, riskFit: 0.25 }, // Conservator
  P9: { importance: 0.30, urgency: 0.25, affordability: 0.15, riskFit: 0.30 }, // Adventurous Optimizer
  default: { importance: 0.25, urgency: 0.25, affordability: 0.25, riskFit: 0.25 },
}

/** Resolve the weight vector for a given persona + optional user overrides.
 *  - persona null  → 'default'
 *  - overrides     → fill missing keys from persona default, re-normalise to 1.0
 *  Returns the merged weights AND a derivation tag for the trace.        */
export function resolveWeights(
  persona: PersonaId | null,
  overrides: Partial<CriterionWeights> | undefined,
): { weights: CriterionWeights; derivation: 'persona-default' | 'user-override' | 'mixed' } {
  const base = PERSONA_WEIGHTS[persona ?? 'default']
  if (!overrides || Object.keys(overrides).length === 0) {
    return { weights: base, derivation: 'persona-default' }
  }

  // Merge: override keys win, missing keys keep base values
  const merged: CriterionWeights = {
    importance:    overrides.importance    ?? base.importance,
    urgency:       overrides.urgency       ?? base.urgency,
    affordability: overrides.affordability ?? base.affordability,
    riskFit:       overrides.riskFit       ?? base.riskFit,
  }

  // Re-normalise to sum 1.0 (catch user-supplied weights that don't sum cleanly)
  const sum = merged.importance + merged.urgency + merged.affordability + merged.riskFit
  if (sum <= 0) return { weights: base, derivation: 'persona-default' }
  const normalised: CriterionWeights = {
    importance:    merged.importance    / sum,
    urgency:       merged.urgency       / sum,
    affordability: merged.affordability / sum,
    riskFit:       merged.riskFit       / sum,
  }

  // If every key was overridden → 'user-override'; otherwise 'mixed'
  const fullyOverridden = ['importance', 'urgency', 'affordability', 'riskFit']
    .every((k) => k in overrides)
  return { weights: normalised, derivation: fullyOverridden ? 'user-override' : 'mixed' }
}
