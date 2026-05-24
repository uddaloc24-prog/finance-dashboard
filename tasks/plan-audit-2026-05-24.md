# Plan Section — Slim & Trim Audit  (UPDATED)

**Date:** 2026-05-24
**Status:** Original audit re-framed under a Plan+Profile orchestration lens
**Scope:** All Plan-tab inputs (6 wheel steps + Profile & Settings), all 14 dashboards, *and* the Profile-tab inputs (Goal Discovery, Psychometric, Risk Profile / Risk Assessment) that must mathematically combine with Plan data.
**Original commit:** `6a4d704` (cosmetic audit) → re-framed by this update.

---

## 0. Why this audit was re-framed

The original audit treated each dashboard as standalone and recommended trimming duplicates. That is still partially valid (Section A/B below), but it misses the **strategic direction**: the Plan inputs (constraints) and Profile inputs (preferences) must combine through a **mathematical orchestration engine** to produce a single artefact:

> a ranked list of goals with priority weights → from which an investment strategy is fitted (bucket allocation + SIP schedule + action list).

Once an engine sits in the middle of the data flow, some "duplicate" KPIs are no longer noise — they're **observability for engine inputs and outputs at different stages**. Other things that looked fine in isolation now reveal themselves as architectural gaps.

This updated audit therefore has two parts:
- **Part A (cosmetic):** what to trim regardless of the engine — still ship.
- **Part B (architectural):** what to build so Plan + Profile actually orchestrate.

---

## 1. Target architecture (new)

```
┌─────────────── PLAN (facts / constraints) ───────────────┐    ┌─────── PROFILE (preferences) ────────┐
│  01 Wealth Snapshot        → corpus, allocation         │    │  Goal Discovery   → raw goals,        │
│  02 Loans & Liabilities    → DTI, lifetime interest      │    │                     money script,      │
│  03 Monthly Budget         → burn rate, category mix     │    │                     persona P1-P9      │
│  04 Demographics           → age, retire age, horizon    │    │  Psychometric v10 → biases, signals,    │
│  05 Inflation              → category-specific drag      │    │                     spousal alignment   │
│  06 Insurance Cover        → protection gaps             │    │  Risk Profile     → matched profile     │
│  Profile & Settings        → tax slab, SIP, withdrawal   │    │  Risk Assessment  → appetite, capacity, │
└──────────────────────────────────────────────────────────┘    │                     deep-risk score     │
                                  │                              └─────────────────────────────────────┘
                                  ▼                                          │
                ┌───────── Plan Health Score (existing) ──────┐               │
                │  8-axis vector → engine pre-input            │               │
                └─────────────────────────────────────────────┘               │
                                  │                                            │
                                  └────────────────┬───────────────────────────┘
                                                   ▼
                          ┌─────────────────────────────────────────────┐
                          │  GOAL RANKING ENGINE  (MCDA + game theory)  │
                          │  scores each goal on:                        │
                          │   • Importance     (from persona + GD)       │
                          │   • Urgency        (from time-to-target)     │
                          │   • Affordability  (from Plan constraints)   │
                          │   • Risk-fit       (from Risk Profile axes)  │
                          │   • Spousal align  (Nash bargaining if 2-up) │
                          │  → priority weight per goal (sums to 1)      │
                          └─────────────────────────────────────────────┘
                                                   │
                                                   ▼
                                  ┌─────────────────────────────────┐
                                  │  STRATEGY FITTER  (constrained) │
                                  │  protect mandatory reserves →    │
                                  │  allocate residual to goals →    │
                                  │  pick bucket per goal horizon → │
                                  │  size SIP per goal              │
                                  └─────────────────────────────────┘
                                                   │
                                                   ▼
                              Investment strategy · 4-bucket alloc ·
                              ranked actions · per-goal SIP schedule
```

### Engine choices (recommendation, not commitment)

1. **Goal scoring — MCDA with AHP weights.** Each goal gets a score on 4-5 normalized criteria. The *weights* on those criteria come from the psychometric/persona signals (a security-seeking P3 weights affordability heavier than aspiration; a builder P7 weights importance heavier). This is the "game theory" hook — the user's *revealed preferences* set the weights, not a hand-coded constant.
2. **Spousal tie-breaks — Nash bargaining solution.** For disputed goals between user and spouse (captured in GD/Psych), maximise the product of utility gains relative to the disagreement point. Tie-breaks naturally without "averaging".
3. **Strategy fitting — constrained greedy allocation.** Mandatory reserves first (term + health, emergency 6×burn, high-rate debt), then allocate remaining corpus + monthly SIP to goals in priority order. Bucket per goal chosen by time-to-target (B1 short, B4 long).
4. **Re-rank on input change.** Engine is pure-functional: any change to Plan or Profile re-runs and the dashboards re-render. No human-in-the-loop curation in v1.

---

## 2. Reclassified findings — what changed under the engine lens

### A. KPI tiles (cosmetic vs orchestration)

| Metric | Original verdict | Updated verdict (engine lens) | Why |
|---|---|---|---|
| Net worth / Gross assets / Liabilities | Cut from Estate | **Keep in NetWorth + Estate** | Net worth is the engine's "affordability ceiling"; Estate's view is the *bequeathable* slice after liabilities — different framing. |
| Liquid corpus (Liquid:Invested) | Cut from NetWorth | **Cut from NetWorth, keep in Liquidity** | Still cosmetic noise. Engine reads from one source (Liquidity). |
| Monthly burn | Cut from many places | **Cut from Liquidity/Healthcare/Inflation KPIs, keep in CashFlow** | Same logic — engine doesn't care where it's shown, but humans get tile fatigue. |
| Asset-class donut in NetWorth | Cut (AssetAllocation has it) | **KEEP — show as engine PRE-input** | NetWorth's donut = your *current* allocation (engine input). AssetAllocation's donuts = current vs *engine-target*. Both legitimate, but rename: NetWorth says "Current Mix", AssetAllocation says "Engine Target vs Mix". |
| Health cover / Life cover / CI cover | Cut from Healthcare + Estate | **KEEP — engine treats these as protection-floor constraints** | Engine refuses to allocate to goals until protection floor is met. So Insurance, Healthcare, Estate are all rendering the same constraint at different fidelities — keep, but unify the *source of truth* (one calc, three views). |
| Plan Health Score sub-axes (8) | Already justified | **Promote to engine pre-input vector** | These 8 axes become *the constraint vector* fed into Affordability + Risk-fit scoring. Currently displayed; under v2 they'd also be persisted to storage as `engineInputs.constraints`. |
| Goal Tracker "SIP required" | Standalone calc | **Replace with engine output** | Currently uses naive equal-split of corpus. The engine produces *the actual* per-goal SIP — Goal Tracker should consume that, not recompute. |
| Plan Executive "Action Priorities" | Hand-coded rules | **Replace with engine action list** | The if/else chain in `deriveActions()` is a placeholder for what the engine will emit. |

### B. Insights blocks

Same trim rules apply, but now framed as: **the engine produces ONE canonical action list; per-dashboard "Insights" boxes carry only observation specific to that lens** (e.g. Liquidity insights talk about lockup ladder mechanics, not "build emergency fund" — that's an engine action).

### C. Editor inputs (UNCHANGED)

Still valid — these are inputs the engine doesn't need:
- AssetInventory: `collectibles`, `foreignAssets`, `crypto`, `npsTier2` → Advanced.
- LoansLiabilities: `familyLoan`, `twoWheelerLoan`, `businessWorkingCapital`, `businessTermLoan` → Advanced.
- InsuranceCover: `corporateGroup` drop; `endowment`+`wholeLife` collapse.
- DemographicsForm: `city` — re-evaluate (engine *could* use city tier for healthcare-cost benchmarks).

### D. Hardcoded constants (UNCHANGED + amplified)

These bugs become *worse* under engine architecture — the engine MUST read user inputs uniformly. Add to original list:

| Where | Constant | Should read |
|---|---|---|
| HealthcareDashboard | `HEALTHCARE_INFLATION = 8.5` | `expenses.healthcareInflation` |
| InflationImpactDashboard | category rates | `expenses.{general,healthcare,education}Inflation` |
| RetirementReadinessDashboard | `nominalReturn = 9.5` | `storage.getReturnAssumptions()` blended |
| PlanExecutiveDashboard | projection at `0.095` | same |
| **NEW** AssetAllocationDashboard | `targetFor(riskAppetite)` hardcoded table | should call into engine → strategy fitter's target |
| **NEW** GoalTrackerDashboard | equal-split corpus assumption | engine's per-goal allocation |

---

## 3. Architectural gaps (NEW — Section F)

What's *missing* from the codebase today that the orchestration architecture needs:

| # | Gap | Where it would live | Difficulty |
|---|---|---|---|
| F1 | **No Plan ↔ Profile bridge.** Plan Executive explicitly excludes Profile data (per earlier user direction). The engine needs both. Need a new `OrchestrationInputs` aggregator that pulls from both stores. | `src/lib/orchestration/inputs.ts` | small |
| F2 | **No structured Goal store informed by GD.** `storage.getGoals()` returns the legacy v2 Goal[], but Goal Discovery answers (`gdState.answers`) aren't projected into Goal[]. Need a `goalsFromGd()` projector. | `src/lib/orchestration/goalsFromGd.ts` | medium |
| F3 | **No Goal Ranking Engine.** Core piece — takes constraints + preferences + goals, returns ranked goals with weights. | `src/lib/orchestration/rankGoals.ts` (MCDA), `src/lib/orchestration/bargain.ts` (Nash, optional) | large |
| F4 | **No Strategy Fitter.** Consumes ranked goals + constraints, emits bucket allocation, per-goal SIP, action list. | `src/lib/orchestration/fitStrategy.ts` | large |
| F5 | **GoalTrackerDashboard uses naive split.** Currently equal-split corpus across goals. Should consume strategy fitter output. | `GoalTrackerDashboard.tsx` | small (after F3+F4) |
| F6 | **PlanExecutive Action Priorities is hand-coded.** `deriveActions()` is rule-based. Replace with engine action list. | `PlanExecutiveDashboard.tsx` | small (after F4) |
| F7 | **AssetAllocationDashboard target table is hand-coded.** `targetFor(riskAppetite)` should come from strategy fitter's per-bucket target. | `AssetAllocationDashboard.tsx` | small (after F4) |
| F8 | **No "Engine Output" dashboard.** There's no place to *see* the engine's reasoning — which weights it used, why goal X beat goal Y. Needed for trust + debugging. | new `EngineExplainDashboard.tsx` | medium |
| F9 | **No persistence of engine outputs.** Re-running on every render is fine, but for downloadable reports we need to snapshot the engine's decision per session. | `src/lib/orchestration/snapshot.ts` + storage key | small |

---

## 4. Phased roadmap (REVISED — supersedes original Section E)

| Phase | Theme | Steps | Ship-ready? |
|---|---|---|---|
| **Phase 1 — Cosmetic trim** (1-2 commits) | Remove tile noise, unify insights | • Strip duplicate KPI tiles from NetWorth (donut → relabel), Healthcare (CI tile), Estate (Life cover, Outstanding debt tiles)  •  De-duplicate insights — Plan Executive owns actions, others keep observation only | ✅ ship today |
| **Phase 2 — Hardcoded → user inputs** (1 commit) | Wire the constants properly so the engine has consistent data later | • HealthcareDashboard reads `expenses.healthcareInflation`  •  Inflation dashboard reads all 3 category rates  •  Retirement + PlanExec read `getReturnAssumptions()` | ✅ ship today |
| **Phase 3 — Editor slim (data-safe)** (2-3 commits) | Hide rare rows behind Advanced disclosure; data not deleted | • Asset rare rows (Advanced)  •  Loan rare rows (Advanced)  •  Insurance: collapse endowment+wholeLife, drop corporateGroup (with migration) | ⚠ medium — needs migration plan |
| **Phase 4 — Orchestration plumbing** (3-5 commits) | Build the data bridge between Plan + Profile, no UI changes yet | F1: `OrchestrationInputs` aggregator  •  F2: `goalsFromGd()` projector  •  unit-test the projections | ✅ ship in isolation |
| **Phase 5 — Goal Ranking Engine** (5-8 commits) | The heart — MCDA + optional Nash | F3: implement MCDA scoring, persona-driven weight derivation, Nash bargain for spousal disagreements  •  test with synthetic inputs  •  expose via `useRankedGoals(profile, gd, psych)` hook | big — design memo first |
| **Phase 6 — Strategy Fitter** (4-6 commits) | Engine output → investment strategy | F4: protection floor → emergency reserve → goal allocation in rank order  •  4-bucket map per goal horizon  •  SIP sizing  •  action list emission | depends on Phase 5 |
| **Phase 7 — Dashboard re-wire** (3-4 commits) | Replace hand-coded dashboards with engine outputs | F5 GoalTracker, F6 PlanExecutive actions, F7 AssetAllocation target | depends on Phase 6 |
| **Phase 8 — Engine Explain dashboard** (2-3 commits) | Trust + debugging surface | F8: per-goal score breakdown, weight derivation trace, "why this beat that" | optional polish |
| **Phase 9 — Snapshot + report integration** (1-2 commits) | Persist engine outputs into PDF/PPTX exports | F9: snapshot to storage, wire into existing exporters | polish |

---

## 5. Design decisions to lock in before Phase 5

These are *not* implementation — they're the design memo Phase 5 needs. Capture them with the user before writing code:

1. **Which MCDA variant?** Weighted sum is simplest; AHP supports pairwise comparison (might map nicely to existing v10 quiz patterns); TOPSIS handles trade-offs better. Recommendation: **weighted sum for v1**, evolve later.
2. **Where do criterion weights come from?** Recommendation: **persona-keyed weight tables** (P1-P9 each define a default 5-criterion weight vector), then tunable per-user via a single "what matters most" slider.
3. **Spousal alignment — is Nash worth it?** Only if two-person profiles are common in the user base. Recommendation: **skip in v1**; assume single decision-maker; add later if needed.
4. **Engine determinism.** Pure function `engine(plan, profile, gd, psych) → ranked goals + strategy`. No randomness. Same inputs → same output. Easy to test, snapshot, audit.
5. **Re-rank latency.** Engine should run in <50ms so UI re-renders feel instant. MCDA + greedy is well within budget for <50 goals.

---

## 6. Status tracker (UPDATED)

### Cosmetic phase (Phases 1-3)
- [ ] **Phase 1** — Strip duplicate KPI tiles + de-duplicate insights (low risk, ship today)
- [ ] **Phase 2** — Wire hardcoded inflation/return constants to user inputs (low risk, ship today)
- [ ] **Phase 3** — Hide rare editor rows behind Advanced; collapse Insurance overlaps (medium, needs migration)

### Orchestration phase (Phases 4-9)
- [ ] **Phase 4** — `OrchestrationInputs` aggregator + `goalsFromGd()` projector (F1, F2)
- [ ] **Phase 5** — Goal Ranking Engine (F3) — *design memo first*
- [ ] **Phase 6** — Strategy Fitter (F4)
- [ ] **Phase 7** — Rewire GoalTracker / PlanExecutive / AssetAllocation onto engine outputs (F5, F6, F7)
- [ ] **Phase 8** — Engine Explain dashboard (F8)
- [ ] **Phase 9** — Snapshot + PDF/PPTX integration (F9)

### Open decisions (lock before Phase 5)
- [ ] Pick MCDA variant (recommendation: weighted sum for v1)
- [ ] Persona-keyed weight tables — define per P1-P9
- [ ] Spousal bargaining in v1 yes / no?
- [ ] Engine determinism contract documented
- [ ] Re-rank latency budget set (recommendation: 50ms)

---

## 7. Files this audit touches (when executed)

- `src/components/plan-dashboards/*.tsx` — trim KPIs + insights
- `src/components/AssetInventory.tsx`, `LoansLiabilities.tsx`, `InsuranceCover.tsx`, `DemographicsForm.tsx` — editor slim
- `src/lib/orchestration/` (NEW directory) — engine code
- `src/types/orchestration.ts` (NEW) — engine input/output types
- `src/components/plan-dashboards/EngineExplainDashboard.tsx` (NEW) — Phase 8
- `src/lib/exporters/*.ts` — integrate engine snapshot — Phase 9
