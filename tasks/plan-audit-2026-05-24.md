# Plan Section — Slim & Trim Audit

**Date:** 2026-05-24
**Scope:** All Plan-tab inputs (6 wheel steps + Profile & Settings) and all 14 dashboards (Profile · Net Worth · Cash Flow · Liquidity · Debt · Retirement Readiness · Insurance · Healthcare · Tax · Asset Allocation · Goal Tracker · Inflation · Tax Calendar · Estate · Plan Executive).
**Commit reference:** `6a4d704` (state at audit time).

---

## A. Repeated KPIs across dashboards

Same number computed and shown in multiple places. Each is fine in isolation; together it is noise.

| Metric | Appears in | Recommendation |
|---|---|---|
| **Net worth / Gross assets / Liabilities** | NetWorth (3 KPI tiles) · Estate (Life cover + Outstanding debt tiles) · Plan Executive (Solvency axis) | Keep in NetWorth only. Estate should show *just* the "bequeathable" number + the MWP gate. |
| **Liquid corpus** | NetWorth (Liquid:Invested split) · Liquidity (Liquid ≤ 1y KPI) · CashFlow indirectly | Keep in Liquidity. Drop from NetWorth (it's a sub-view of Liquidity). |
| **Monthly burn** | CashFlow (Outflow tile) · Liquidity (Monthly burn KPI) · Healthcare · Inflation (Annual burn) · Plan Executive | Keep in CashFlow. Other dashboards can reference it inline in their insight text, not as a KPI tile. |
| **Health cover ₹ + gap** | Insurance (4 KPIs + GapBar) · Healthcare (CI gap KPI) · Estate (Life cover KPI) | Keep all in Insurance. Healthcare should *only* show the projected spend curve; Estate should show MWP only. |
| **CI gap** | Insurance · Healthcare | Pick Insurance. |
| **Life cover + MWP flag** | Insurance · Estate · Plan Executive (Protection axis) | Insurance owns it; Estate's "Critical action" banner restates the Insurance "term plan not MWP" insight. |
| **DTI ratio** | Debt (gauge) · Plan Executive (axis) | Keep both — Plan Executive aggregates, Debt drills. ✓ valid. |
| **Inflation %** | Inflation (4 KPIs) · Plan Executive | Valid — Inflation dashboard is the deep view. |
| **Asset-class breakdown donut** | NetWorth (donut) · AssetAllocation (current + target donuts) | Drop the donut from NetWorth; AssetAllocation does it better with target comparison. NetWorth keeps just the **top-5 concentration** + KPI tiles. |
| **Top-5 concentration / diversification** | NetWorth (Top 5 list) · AssetAllocation (drift bars) · Plan Executive (Diversification axis) | Keep NetWorth's Top-5 (it's distinct from drift). |
| **80C / NPS / 80D usage** | Tax (4 deduction rows) · Plan Executive (Tax efficiency axis) | Valid — Tax drills, PlanExec scores. |
| **Surplus deployment (40/30/20/10)** | CashFlow (deployment block) · Plan Executive (strategy plays) | Keep CashFlow. PlanExec strategy plays should focus on Plan-Executive-specific actions, not restate. |

---

## B. Redundant "Insights" sections

Every dashboard has an "Insights" green box at the bottom. Many restate the same rules:

- **"Build emergency fund > 6 months"** → appears in Liquidity, NetWorth, Plan Executive actions
- **"DTI > 50% is unsustainable"** → Debt + Plan Executive
- **"No active term plan / MWP gap"** → Insurance + Estate + Plan Executive
- **"Healthcare premium > 15% of outflow"** → Insurance only (good — leave as is)
- **"Diversify top 5 holdings"** → NetWorth + AssetAllocation + Plan Executive

**Fix:** make Plan Executive the single source of *actions*; the per-dashboard Insights box should only carry observations specific to that dashboard's lens (e.g. Liquidity insights = lockup-ladder commentary, not generic emergency-fund advice).

---

## C. Editor inputs that don't pull weight

| Editor | Field | Verdict |
|---|---|---|
| **AssetInventory** (Step 01) | `collectibles`, `foreignAssets`, `crypto` | Drop unless the user enables an "Advanced" toggle — adds 3 rows, used by <1% of retirees. |
| **AssetInventory** | `npsTier2` | Edge case for retirees; Tier-1 covers 99% of use. Move to Advanced. |
| **LoansLiabilities** (Step 02) | `familyLoan`, `twoWheelerLoan`, `businessWorkingCapital`, `businessTermLoan` | Drop or move to Advanced — retirees rarely have these; cuts 4 of 13 loan rows. |
| **InsuranceCover** (Step 06) | `corporateGroup` (employer plan), `endowment`, `wholeLife` | `corporateGroup` is irrelevant post-retirement. `endowment`/`wholeLife` overlap heavily — collapse into one "Traditional life policy" row. |
| **DemographicsForm** (Step 04) | `city` (metro/tier1/tier2/tier3) | Used only by InsuranceCoverageDashboard for benchmark scaling. If we just default to "metro" benchmark for everyone, we can drop this input entirely. |

---

## D. Hardcoded numbers that should read user inputs (fix, don't trim)

These are NOT redundancy — they're missed re-use that creates inconsistency between the user-set value (Step 05) and what the dashboards actually use.

| Dashboard | Hardcoded constant | Should read |
|---|---|---|
| HealthcareDashboard | `HEALTHCARE_INFLATION = 8.5` | `profile.expenses.healthcareInflation` |
| InflationImpactDashboard | `general: 6.0, healthcare: 8.5, education: 10.0` | `profile.expenses.generalInflation / healthcareInflation / educationInflation` |
| RetirementReadinessDashboard | `nominalReturn = 9.5` | `storage.getReturnAssumptions()` blended return |
| PlanExecutiveDashboard | corpus projection at `0.095` | same as above |

Note: `healthcareInflation` and `educationInflation` ARE read in `lib/calculations.ts:267-268`, so they earn their keep in the InflationAssumptions editor — but the dashboards bypass them.

---

## E. Recommended trim plan — in priority order

| # | Action | Files touched | Lines saved | Risk |
|---|---|---|---|---|
| 1 | **Strip duplicate KPI tiles** from NetWorth (remove asset donut), Healthcare (remove CI-gap tile), Estate (remove Life cover + Outstanding debt tiles) | 3 dashboard files | ~80 | low |
| 2 | **De-duplicate insights** — make Plan Executive own all "actions"; other dashboards keep only observational insights | 8 dashboard files | ~60 | low |
| 3 | **Wire hardcoded inflation/return** to actual user inputs | 4 dashboard files | small but real consistency win | low |
| 4 | **Collapse Insurance overlaps**: merge `endowment` + `wholeLife` into one "Traditional" row; drop `corporateGroup` | InsuranceCover.tsx + 2 dashboards | ~30 + 1 row | medium (existing user data could be present) |
| 5 | **Hide Loans/Asset/Insurance rare rows behind "Advanced" disclosure**: collectibles, foreignAssets, crypto, npsTier2, familyLoan, twoWheelerLoan, business loans | AssetInventory.tsx, LoansLiabilities.tsx, InsuranceCover.tsx | ~50 | medium |
| 6 | **Drop `city` input** unless we genuinely want city-tiered benchmarks | DemographicsForm.tsx, InsuranceCoverageDashboard.tsx | ~25 | low |

Each step is independent — can ship as separate commits.

**Recommendation:** start with #1, #2, #3 (low-risk, immediate clarity gain, no data-shape changes). Hold #4-6 — they require migration logic if existing users have data in those fields.

---

## Status tracking

- [ ] #1 Strip duplicate KPI tiles
- [ ] #2 De-duplicate insights
- [ ] #3 Wire hardcoded inflation/return to user inputs
- [ ] #4 Collapse Insurance overlaps (needs migration plan)
- [ ] #5 Hide rare editor rows behind Advanced (needs migration plan)
- [ ] #6 Drop `city` input
