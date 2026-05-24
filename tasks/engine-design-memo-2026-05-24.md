# Phase 5 — Goal Ranking Engine · Design Memo

**Date:** 2026-05-24
**Status:** Design — locking decisions before code
**Audit reference:** `tasks/plan-audit-2026-05-24.md` §1, §3 (F3), §5
**Author hand-off:** decisions §2.1–§2.5 to be confirmed before §3 code lands.

---

## 1. What the engine does (one paragraph)

Given the user's **Plan facts** (corpus, debts, budget, demographics, inflation, insurance) and **Profile preferences** (risk profile, persona, money script, raw goal pile from Goal Discovery), produce **a deterministic ranked list of goals with priority weights summing to 1.0**, plus enough trace data that a downstream Strategy Fitter can allocate corpus + SIP and emit an action list. Pure function, no side effects, < 50 ms.

---

## 2. Decisions locked (5)

> ✅ **All five confirmed by product owner on 2026-05-24.**
> The recommended option in each subsection below is now the locked v1 contract. Changing any of these post-lock requires an updated memo + golden-master snapshot refresh.

### 2.1 MCDA variant   ✅ LOCKED — Weighted Sum (v1)
**Recommendation:** **weighted sum** for v1.

| Variant | Pros | Cons | Pick? |
|---|---|---|---|
| Weighted sum | Trivial · transparent · sub-30-line implementation | Assumes criteria are independent + compensatory | ✅ v1 |
| AHP (Analytic Hierarchy Process) | Pairwise comparison maps to user-quiz interaction | Needs full N×N matrix per criterion, slower input UX | v2 if user adoption demands it |
| TOPSIS | Better trade-off handling (closeness to ideal) | Requires "ideal" and "anti-ideal" reference vectors that we don't yet have data for | v3 if portfolio data matures |
| Multi-objective optimisation (Pareto) | Mathematically rigorous | No single ranking — needs disambiguation layer | overkill |

~~**Decision required:** confirm v1 = weighted sum.~~  →  **Confirmed 2026-05-24.**

### 2.2 Where do criterion weights come from?   ✅ LOCKED — Persona-keyed defaults, user-overridable
**Recommendation:** **persona-keyed default weight vectors** (P1–P9), tunable by a single "what matters most" 5-point slider per criterion. See §5 for the proposed default table.

Alternatives considered:
- Hard-coded global weights: ignores user preferences entirely.
- Pure AHP-from-quiz: too much UI friction for first run.
- ML-learned weights: needs labelled data we don't have.

~~**Decision required:** confirm persona-keyed defaults + user-overridable.~~  →  **Confirmed 2026-05-24.**

### 2.3 Spousal alignment — is Nash bargaining worth it?   ✅ LOCKED — Skip in v1, single decision-maker
**Recommendation:** **skip in v1.** Treat user as single decision-maker. Capture spousal disagreement as a per-goal `disputed: boolean` flag for the Strategy Fitter to surface separately; do not yet resolve mathematically.

Reasoning: Nash bargaining is conceptually clean but needs a separately-completed spouse Profile to be meaningful. Most users won't have that on day-1. Adding a half-baked spousal mode signals false precision.

**Add later if:** > 30% of active users have spouse profiles. Track this metric.

~~**Decision required:** confirm "single decision-maker in v1".~~  →  **Confirmed 2026-05-24.** v1 ships single decision-maker; `disputed: boolean` flag stays in the output schema but is always `false` in v1.

### 2.4 Determinism contract   ✅ LOCKED — Pure function, byte-for-byte identical output
**Recommendation:** **pure function · same inputs → identical output, byte-for-byte.**

- No `Date.now()`, no `Math.random()`, no `Intl` locale-dependent string formatting.
- Inflation projections / FV calcs are closed-form (no Monte-Carlo).
- All sorts use stable tiebreakers (id then name).
- Output object is JSON-serialisable for snapshot persistence (F9).

~~**Decision required:** confirm determinism as a hard contract (enforced by snapshot tests).~~  →  **Confirmed 2026-05-24.** Determinism is enforced by `determinism.test.ts` running the engine 100× over the same input and asserting identical output JSON + identical `inputsHash`.

### 2.5 Re-rank latency budget   ✅ LOCKED — 50 ms engine p95, 100 ms including React render
**Recommendation:** **50 ms p95** for the engine itself; **100 ms p95** including React re-render.

At < 50 goals + 8 criteria + weighted sum + greedy allocation, this is trivially achievable. Setting it as a contract now means we'll notice if someone later adds a quadratic step.

~~**Decision required:** confirm 50 ms / 100 ms budgets, enforce via test.~~  →  **Confirmed 2026-05-24.** Budget enforced by `latency.test.ts` (50 goals × 100 runs, p95 < 50 ms).

---

## 3. Input contract

```ts
// src/types/orchestration.ts
export interface EngineInput {
  plan: PlanFacts            // distilled from UserProfile + buckets
  preferences: Preferences   // distilled from Profile-tab state
  goals: RawGoal[]           // from storage.getGoals() + goalsFromGd()
}

export interface PlanFacts {
  corpus: number             // totalCorpus(buckets) || profile.corpus
  netWorth: number
  monthlyBurn: number
  monthlyEMI: number
  liquidCorpus: number
  passiveIncome: number
  monthlyWithdrawal: number
  monthlySIP: number
  currentAge: number
  retireAge: number
  lifeExpectancy: number
  inflation: { general: number; healthcare: number; education: number }
  blendedReturn: number      // from lib/blendedReturn
  insurance: {
    healthCover: number; lifeCover: number; ciCover: number
    termActive: boolean; termMwp: boolean
  }
  taxBracket: 0 | 5 | 20 | 30
  riskAppetite: 1 | 2 | 3 | 4 | 5
}

export interface Preferences {
  personaPrimary: PersonaId | null      // P1-P9 from GD inference
  personaConfidence: 'high' | 'medium' | 'low' | 'unclassified'
  riskProfile: number | null            // 0-100 from v10 composites
  moneyScript: 'avoidance' | 'worship' | 'status' | 'vigilance' | null
  weightOverrides?: Partial<CriterionWeights>  // user slider tweaks
}

export interface RawGoal {
  id: string
  label: string
  kind: 'income' | 'event' | 'legacy' | 'corpus-build'
  amount: number             // today's rupees
  startYear?: number         // target year
  endYear?: number           // for income-stream goals
  priority: 'must-have' | 'nice-to-have'
  inflationCategory: 'general' | 'healthcare' | 'education'
  source: 'manual' | 'gd-projection'   // where did this goal come from
}
```

---

## 4. Output contract

```ts
export interface EngineOutput {
  ranked: RankedGoal[]               // sorted by score desc, weights sum to 1.0
  weightsUsed: CriterionWeights      // what weights drove this ranking
  trace: EngineTrace                 // per-goal score breakdown for the Explain dashboard
  emittedAt: string                  // ISO — for snapshot
  inputsHash: string                 // short content hash of EngineInput — for cache + audit
}

export interface RankedGoal {
  goal: RawGoal
  scores: CriterionScores            // {importance, urgency, affordability, riskFit}
  composite: number                  // 0-100
  priorityWeight: number             // share of total weight (sums to 1.0)
  disputed?: boolean                 // reserved for spousal mode
}

export interface CriterionWeights {
  importance: number
  urgency: number
  affordability: number
  riskFit: number
  // (sum = 1.0)
}

export interface CriterionScores extends CriterionWeights {}  // 0-100 each

export interface EngineTrace {
  personaUsed: PersonaId | 'default'
  weightDerivation: 'persona-default' | 'user-override' | 'mixed'
  goalRationale: Record<string, string[]>  // goalId → bullet trace
}
```

---

## 5. Persona-keyed default weight vectors (proposed)

Each persona below maps to a 4-tuple summing to 1.0. To be reviewed with whoever owns persona definitions.

| Persona | Description (working) | Importance | Urgency | Affordability | Risk-fit |
|---|---|---|---|---|---|
| **P1** Security Seeker      | "I want to sleep at night."             | 0.20 | 0.20 | 0.40 | 0.20 |
| **P2** Status Builder       | "Visible markers of success matter."    | 0.40 | 0.20 | 0.25 | 0.15 |
| **P3** Cautious Saver       | "FD ladder + PPF — keep it simple."     | 0.20 | 0.15 | 0.40 | 0.25 |
| **P4** Aspirational Investor| "Big goals worth the risk."             | 0.40 | 0.25 | 0.20 | 0.15 |
| **P5** Balanced Planner     | "Diversify, review annually."           | 0.25 | 0.25 | 0.25 | 0.25 |
| **P6** Goal Hunter          | "Deadlines drive me."                   | 0.30 | 0.35 | 0.20 | 0.15 |
| **P7** Builder              | "Compound everything, decades-out."     | 0.35 | 0.10 | 0.25 | 0.30 |
| **P8** Conservator          | "Capital preservation > growth."        | 0.20 | 0.15 | 0.40 | 0.25 |
| **P9** Adventurous Optimizer| "High risk = high reward, calculated."  | 0.30 | 0.25 | 0.15 | 0.30 |
| **default** (unclassified)  | fall-back when persona is null          | 0.25 | 0.25 | 0.25 | 0.25 |

**Decision required:** sign off this table OR mark for re-derivation from existing persona research.

---

## 6. Algorithm — step by step

```
function rankGoals(input: EngineInput): EngineOutput {

  // 1. Resolve weights
  let weights = PERSONA_WEIGHTS[input.preferences.personaPrimary ?? 'default']
  if (input.preferences.weightOverrides) {
    weights = mergeAndRenormalise(weights, input.preferences.weightOverrides)
  }

  // 2. Score each goal on each criterion (0-100)
  const scored = input.goals.map(g => ({
    goal: g,
    scores: {
      importance:    scoreImportance(g, input.preferences),
      urgency:       scoreUrgency(g, input.plan),
      affordability: scoreAffordability(g, input.plan),
      riskFit:       scoreRiskFit(g, input.plan, input.preferences),
    }
  }))

  // 3. Composite = weighted sum
  const composited = scored.map(s => ({
    ...s,
    composite: (
      s.scores.importance    * weights.importance +
      s.scores.urgency       * weights.urgency +
      s.scores.affordability * weights.affordability +
      s.scores.riskFit       * weights.riskFit
    )
  }))

  // 4. Stable sort (composite desc → priority must-have first → id asc)
  composited.sort(stableTiebreaker)

  // 5. Normalise composites to priority weights summing to 1.0
  const sum = composited.reduce((s, c) => s + c.composite, 0) || 1
  const ranked = composited.map(c => ({
    ...c,
    priorityWeight: c.composite / sum
  }))

  // 6. Build trace
  return { ranked, weightsUsed: weights, trace: buildTrace(...), emittedAt, inputsHash }
}
```

**Per-criterion scorers (one-liner spec each):**

- **Importance** — bumps for `priority === 'must-have'` (+30), for "income" kind (+20), for legacy (+10). Capped at 100.
- **Urgency** — `100 - min(100, yearsToTarget × 3)`. Goals targeted within 3y score near 100; 30y+ goals score near 0. Adjusted up by must-have bonus.
- **Affordability** — feasibility ratio: how much of the goal's required-SIP can be funded from `monthlyBurn-corrected surplus`. 100 = fully fundable, 0 = unfundable at current trajectory.
- **Risk-fit** — alignment of goal's time-horizon to `riskAppetite × bucket-allocation profile`. Short-horizon goals score high for low-appetite users; long-horizon goals score high for high-appetite users. Mismatch deducts.

---

## 7. Mandatory pre-emption (before ranking)

Some "goals" are non-negotiable and outrank everything. Engine handles them by **reserving corpus + monthly cash flow before** running the MCDA pass:

1. **Term-life cover** — if user is < 70 and `lifeCover < 8 × annualBurn`, reserve premium for ≥ `5 × annualBurn` term until met.
2. **Health cover floor** — if `healthCover < cityBenchmark × ageMultiplier`, reserve premium.
3. **Emergency fund** — reserve cash flow until `liquidCorpus ≥ 6 × monthlyBurn`.
4. **High-rate debt** — any active loan with `interestRate ≥ 15%` gets full surplus reroute until cleared.

These pre-emptions emit as **system goals** in the output with `priority: must-have` and `priorityWeight` proportional to the reserve size. They appear in `ranked` at the top, then user goals follow.

---

## 8. Edge cases

| Case | Behaviour |
|---|---|
| No goals at all | Output empty `ranked`, log trace entry "no goals to rank" |
| No persona inferred | Use `default` weight vector |
| Corpus = 0 | All `affordability` scores = 0; engine still ranks (Strategy Fitter handles "can't fund anything") |
| Goal targeted in the past (`startYear < currentYear`) | Treat as overdue → urgency = 100, importance bump |
| Two goals identical except `id` | Stable sort breaks tie deterministically |
| Spousal disagreement flag set | Mark `disputed: true` in output, do not yet alter ranking |
| Weight override sums ≠ 1.0 | Engine re-normalises silently; trace records original input |

---

## 9. Test plan

### Unit tests (Vitest)
- One per scorer (`scoreImportance`, `scoreUrgency`, `scoreAffordability`, `scoreRiskFit`)
- One per pre-emption rule
- Tiebreaker stability test
- Weight re-normalisation test
- Each persona × goal-set permutation (9 × 3 = 27 quick cases)

### Golden-master snapshots
- Three personas (P1, P5, P7) × three Plan profiles (early-50s, late-60s, post-retirement) × a fixed 5-goal pile.
- Engine output committed under `src/lib/orchestration/__snapshots__/`.
- Any change to engine logic must update or justify snapshot diffs.

### Determinism test
- Run engine 100× with same input. Assert identical `inputsHash` and identical output JSON.

### Latency test
- 50 goals × 100 runs. p95 < 50 ms.

---

## 10. Files to add when implementation lands

```
src/types/orchestration.ts              — input/output type contract
src/lib/orchestration/
  ├ inputs.ts                           — aggregator (F1 from audit)
  ├ goalsFromGd.ts                      — GD → RawGoal[] projector (F2)
  ├ rankGoals.ts                        — the engine itself (F3)
  ├ personaWeights.ts                   — weight vector table (§5)
  ├ scorers.ts                          — per-criterion scoring (§6)
  ├ preempt.ts                          — mandatory pre-emption (§7)
  ├ tiebreaker.ts                       — stable sort helper
  ├ hash.ts                             — content hashing for inputsHash
  └ __tests__/
      ├ scorers.test.ts
      ├ rankGoals.test.ts
      ├ determinism.test.ts
      ├ latency.test.ts
      └ __snapshots__/
src/hooks/useRankedGoals.ts             — React hook wrapping the engine
```

---

## 11. Open questions (need answers from product owner)

1. **Persona weight table (§5)** — sign off as-is, or commission per-persona review with the original v10 author?
2. **Mandatory pre-emption thresholds (§7)** — are the multipliers (8× life cover, 6× emergency fund, 15% debt rate) acceptable defaults or should they be user-tunable?
3. **Pre-empt "goals"** — should they appear in `ranked` (visible to user) or be hidden behind a separate `reservations` array (cleaner separation)?
4. **Trace verbosity** — full per-goal reasoning bullets (heavy) or scores-only (lean)? Affects Engine Explain dashboard fidelity later.
5. **Snapshot storage** — engine output snapshot on every Plan/Profile change, or only on explicit "Save Plan" action? Affects storage churn.

---

## Status

- [x] Memo drafted (2026-05-24)
- [x] **Decisions §2.1–§2.5 confirmed (2026-05-24)** — weighted sum · persona-keyed weights · single decision-maker · pure-function determinism · 50 ms p95 latency
- [ ] Persona weight table (§5) signed off
- [ ] Open questions (§11) answered
- [ ] `EngineInput` / `EngineOutput` types committed (`src/types/orchestration.ts`) → **Phase 4 / Phase 5 START NOW UNBLOCKED**
- [ ] Scorers + tests
- [ ] Engine + golden-master snapshots
- [ ] `useRankedGoals` hook
- [ ] Strategy Fitter (Phase 6) — separate memo
