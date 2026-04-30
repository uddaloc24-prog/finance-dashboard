# Indian Retirement Planner — User Manual

**Version 2.0** · April 2026
Live tool: <https://finance-liart-nine.vercel.app/>

---

## Table of Contents

1. [About this Tool](#1-about-this-tool)
2. [Quick Start — A Five-Minute Tour](#2-quick-start--a-five-minute-tour)
3. [Core Concepts](#3-core-concepts)
4. [The Plan Tab — Your Inputs](#4-the-plan-tab--your-inputs)
5. [The Profile Tab — Risk Profiling and the Five Strategies](#5-the-profile-tab--risk-profiling-and-the-five-strategies)
6. [The Compare Tab — Ten-Strategy Side-by-Side](#6-the-compare-tab--ten-strategy-side-by-side)
7. [The Buckets Tab — Detailed Allocation Controls](#7-the-buckets-tab--detailed-allocation-controls)
8. [The Simulate Tab — Stress Tests and Monte Carlo](#8-the-simulate-tab--stress-tests-and-monte-carlo)
9. [The Tax Tab — Indian Tax Engine](#9-the-tax-tab--indian-tax-engine)
10. [Methodology](#10-methodology)
11. [Glossary](#11-glossary)
12. [Frequently Asked Questions](#12-frequently-asked-questions)
13. [Limitations and Disclaimers](#13-limitations-and-disclaimers)

---

## 1. About this Tool

The Indian Retirement Planner is a browser-based financial planning application designed for Indian retirees and pre-retirees who want to convert a lump-sum corpus into reliable monthly income for the next 20 to 30 years. It encodes the academic four-bucket refill-linked strategy widely taught in Indian wealth management circles, supplemented with guardrail-aware withdrawal rules, a curated AMFI-listed fund universe, an India-specific tax engine (FY 2024-25), Monte Carlo stress testing, and a head-to-head comparison of ten global retirement income strategies.

**Who it is for**

- Indian retirees aged 50 to 75 with a corpus between ₹25 lakh and ₹50 crore
- Couples planning a joint retirement income stream
- Pre-retirees wanting to verify their plan before stopping work
- Financial advisors looking for an analytical second opinion
- FIRE candidates testing the durability of an early-retirement corpus

**Who it is not for**

- Investors needing personalised tax-return preparation
- Individuals whose primary residence is outside India (currency and tax assumptions are INR/Indian-resident)
- Anyone seeking real-time portfolio execution — this tool plans, it does not transact

**Operating principles**

- Every calculation runs in your browser. Nothing about your finances leaves your device.
- All figures are stored only in your browser's local storage. Clearing the browser cache resets the planner.
- The tool is free; there is no account, no login, no subscription.

---

## 2. Quick Start — A Five-Minute Tour

### Step 1 — Enter your headline numbers

Open the **Plan** tab. Enter:

- Your total retirement corpus (the rupee amount you intend to draw from)
- The monthly amount you need (or want) to withdraw
- Your current age, retirement age, and life expectancy
- Your monthly expense breakdown across essentials, lifestyle, healthcare, and education

The header strip at the top of every page updates instantly: total corpus, monthly draw, withdrawal rate (with traffic-light colour), and B1 runway.

### Step 2 — Take the risk quiz

Open the **Profile** tab. Click **Take risk quiz**. Answer ten questions covering your time horizon, secondary income, crash tolerance, investing experience, legacy intent, and management appetite. The quiz takes ninety seconds.

Your score (range 10 to 50) maps to one of five risk profiles, each with a fixed bucket allocation and a specific instrument mix.

### Step 3 — Compare your strategy options

Open the **Compare** tab. The tool runs ten retirement income strategies against your corpus and target, applies Indian tax, and produces a sortable scorecard. The strategy with the highest passing score is starred as your **Best Fit**.

### Step 4 — Stress test it

Open the **Simulate** tab. Click **Run simulation** to fan out two hundred Monte Carlo paths. The success rate (percentage of runs where the corpus survives the full horizon) tells you whether the plan is robust to market noise.

### Step 5 — Optimise the tax

Open the **Tax** tab. Pick your tax slab. Review the year-by-year tax projection, the LTCG harvesting schedule, and the slab-specific reshuffle advice.

You now have a complete, defensible retirement plan — annualised income, residual corpus, tax bill, and contingency response — ready to share with a CA or financial advisor.

---

## 3. Core Concepts

### 3.1 The Four Buckets

Your corpus is divided into four buckets, each with its own time horizon, risk profile, and role.

| Bucket | Horizon | Role | Typical Instruments | Default Allocation (Moderate) |
|--------|---------|------|---------------------|-------------------------------|
| **B1** | 0–2 years | Liquidity buffer for monthly withdrawals | Liquid funds, overnight funds, arbitrage | 10% |
| **B2** | 5-year ladder | Fixed-income floor; never drawn or refilled mid-cycle | SCSS, PMVVY, RBI Floating Rate Bonds, senior FD ladder | 20% |
| **B3** | 5–10 years | Stability and SWP source | Balanced Advantage, aggressive hybrid, equity savings | 25% |
| **B4** | 10+ years | Growth engine and refill source | Flexi-cap, large-and-midcap, multi-asset, gold ETF, REITs | 45% |

### 3.2 The Refill Chain

Withdrawals are paid from B1 first; if B1 runs short, the simulator draws directly from B3 and then B4 (in losing equity years, B4 is skipped — you do not sell at a loss). At year-end:

- Surplus B4 returns are harvested into B3 (subject to LTCG tax). This happens when B4 returns ≥ 12% in a year, or when B3's coverage ratio drops below six years of withdrawals.
- B3 tops up B1 to maintain a two-year cash buffer.
- B2 is a five-year fixed-deposit ladder — held to maturity, then renewed, never drained mid-cycle.

This refill chain is what allows the strategy to preserve principal across a 25-year horizon while continuing to pay inflation-adjusted income.

### 3.3 Guardrails (Guyton-Klinger inspired)

To survive a 30%–40% market crash, the simulator applies dynamic withdrawal rules:

- **Inflation freeze** — if the total corpus drops below 85% of starting value at any year-end, the planned inflation increase on next year's withdrawal is skipped.
- **Cut rule** — if the corpus drops below 70% of starting value, the next year's withdrawal is reduced by 10% in addition to the freeze.
- **No-loss harvesting** — in any year where B4 equity return is negative, the B4 → B3 harvest is skipped entirely. Equity is not redeemed at a loss.
- **Stress test** — every plan is replayed against a one-time 35% B4 crash in year five (the worst sequence-of-returns timing). The verdict downgrades from "Achievable" to "Achievable with adjustments" if the plan recovers but is fragile to this shock.

### 3.4 Indian Tax Treatment (FY 2024-25)

Each instrument in your plan attracts one of seven tax classes:

| Class | Examples | Tax Rule |
|-------|----------|----------|
| Equity LTCG | Equity MF, BAF, flexi-cap | 12.5% on gains above ₹1.25L per year |
| Debt MF (slab) | Corporate bond, short-duration, liquid | Slab rate on all gains (post-Apr 2023 rule) |
| Interest (slab) | SCSS, PMVVY, POMIS, RBI bonds, FD non-bank | Slab rate on interest income |
| Bank interest (80TTB) | Bank FD, savings, post-office deposits | Slab rate, less ₹50k senior-citizen exemption |
| Tax-free | PPF | Fully exempt (EEE) |
| REIT mixed | Embassy, Mindspace REITs | Approximately 50% slab + 50% LTCG (verify with CA) |
| NPS annuity | Annuity payouts post-60 | Slab rate on annuity income |

The tool applies these rules automatically to compute your post-tax monthly income for every strategy.

### 3.5 The Five Risk Profiles

| Profile | Score | Equity % | Year-1 Income (₹1Cr) | Year-20 Corpus (₹1Cr) |
|---------|-------|----------|----------------------|------------------------|
| Ultra-Conservative | 10–19 | ~12.5% | ₹55,668 | ₹18 L |
| Conservative | 20–27 | ~17% | ₹60,000 | ₹35 L |
| Moderate ⭐ | 28–35 | ~57% | ₹60,000 | ₹2.35 Cr |
| Moderately Aggressive | 36–43 | ~57% | ₹58,000 | ₹3.20 Cr |
| Aggressive / FIRE | 44–50 | ~78% | ₹50,000 | ₹4.50 Cr |

The Moderate profile is the recommended default for most Indian retirees with a 20-year-plus horizon.

---

## 4. The Plan Tab — Your Inputs

The Plan tab captures every input that drives the rest of the tool. The form is grouped into three sections.

### 4.1 Profile and Withdrawal

- **Total corpus** — the rupee amount earmarked for retirement income. Excludes your primary residence, separate emergency fund, and any inheritance you do not intend to spend.
- **Withdrawal frequency** — choose monthly, quarterly, half-yearly, or yearly. The amount you enter is interpreted at the chosen frequency; the tool internally normalises everything to monthly.
- **SIP / passive income** — recurring income from outside the corpus (rental, pension, part-time work). This reduces the effective withdrawal needed from the corpus.
- **Bucket allocation overrides** — if you want to deviate from the default 10/35/25/30 split, adjust each percentage. The total must sum to 100.

### 4.2 Demographics

- **Current age** — your age as of today, not at retirement.
- **Retirement age** — when you stop earning. If already retired, leave equal to current age.
- **Life expectancy** — used to set the simulation horizon. Default 90 years; use 95 if either spouse has long-lived parents.
- **City tier** — Metro / Tier 1 / Tier 2 / Rural — affects expense base and inflation defaults.
- **Spouse age and life expectancy** — optional. The plan funds the longer-lived spouse.

### 4.3 Expense Breakdown

Four expense categories with their own inflation curves:

- **Essential** — rent, utilities, food, transport (general inflation ~6.5%)
- **Lifestyle** — travel, dining, entertainment (general inflation)
- **Healthcare** — premiums, OPD, treatment (healthcare inflation ~10%)
- **Education** — grandchildren's education or your own continued learning (education inflation ~12%)

Below the inputs, the tool projects your total monthly expense at year 10 and year 20 using the category-weighted inflation rate. Use this to verify that your withdrawal target matches your real living cost — many users dramatically undershoot the year-20 number.

---

## 5. The Profile Tab — Risk Profiling and the Five Strategies

The Profile tab establishes your risk classification and shows you what each of the five profiles would look like on your specific corpus. It is a single page; all five profiles are visible side-by-side.

### 5.1 The Risk Quiz

Ten questions across three sections:

- **Section A — Time horizon and demographics** (questions 1–3): your retirement horizon, secondary income, share of expenses that are non-negotiable.
- **Section B — Risk capacity and psychology** (questions 4–7): your reaction to a 30% drop, monthly volatility tolerance, investing experience, separate emergency cash.
- **Section C — Goals and complexity** (questions 8–10): your legacy intent, inflation concern, and management commitment.

Each question scores one to five. Your total maps to one of the five profiles. The match is non-binding — you can override and pick any profile from the side-by-side grid.

### 5.2 The Side-by-Side Grid

All five profiles are displayed in five columns with vertical demarcation. Each column contains:

- **Header** — profile name, score range, tagline
- **Allocation bar** — colour-coded share of B1 / B2 / B3 / B4 with equity percentage
- **Three KPIs** — Year-1 monthly income, Year-10 monthly income, Year-20 corpus (in green if it exceeds your starting amount, otherwise grey)
- **Strengths and trade-offs** — top two of each
- **Best for** — one-line target audience description
- **Instrument list** — expandable; shows the eight to nine recommended funds with bucket badge, category, expected CAGR, and your scaled rupee allocation
- **Action button** — "Use this plan" if matched; "Choose this" otherwise

### 5.3 Profile Matching Logic

The matched profile is highlighted with a thin blue top-border, a "YOU" badge, and a tinted background. Clicking "Use this plan" loads that profile's instrument mix into the Tax tab and any future cross-referencing screens.

### 5.4 Profile Specifics

#### Ultra-Conservative (10–19)

100% government-backed safety. SCSS + PMVVY + RBI bonds + POMIS + senior FD + PPF + a small liquid-fund tail. Monthly income is steady but inflation erodes its real value over 20 years (₹1Cr corpus ends at ₹18L of real-terms purchasing power).

Best for retirees aged 70+, single-source pensioners, or anyone who would panic in a market crash.

#### Conservative (20–27)

Predominantly debt with a 15% hybrid kicker for inflation protection. SCSS + Nippon Short Duration + HDFC Corporate Bond + Parag Parikh Conservative Hybrid + senior FD + HDFC Balanced Advantage. Year-1 income ~₹60,000; corpus stagnates rather than grows.

Best for retirees aged 65–75 with a secondary income stream.

#### Moderate (28–35) — Recommended Default

The classic four-bucket SWP model. SCSS + HDFC Short Duration + ICICI Equity & Debt + Mirae BAF + Parag Parikh Flexi Cap + Nifty 50 Index + Mirae Emerging Bluechip. Year-1 ₹60,000, Year-10 ~₹92,000, Year-20 corpus ~₹2.35 Cr.

Best for most Indian retirees aged 55–70 with a 20-year-plus horizon.

#### Moderately Aggressive (36–43)

Adds midcap and international exposure. SCSS + Banking & PSU Fund + HDFC BAF + Kotak Equity Hybrid + Nifty 50 + Parag Parikh + Quant Small Cap + Motilal Nasdaq 100 FoF. Year-1 ~₹58,000, Year-10 ~₹1.05L, Year-20 corpus ~₹3.20 Cr.

Best for retirees aged 50–65 with secondary income and tolerance for a 25% drawdown.

#### Aggressive / FIRE (44–50)

70% equity. Endowment-style — corpus is treated as an income engine, not a finite pool. Year-1 ~₹50,000, Year-10 ~₹1.10L, Year-20 ~₹4.50 Cr. Includes REITs and international exposure.

Best for FIRE retirees aged 40–55 with non-portfolio income and tolerance for 40%-plus drawdowns.

---

## 6. The Compare Tab — Ten-Strategy Side-by-Side

The Compare tab applies ten retirement income strategies — Indian and global — to your corpus and target, then ranks them. This is the analytical heart of the tool.

### 6.1 The Ten Strategies

| # | Strategy | Origin | Safe WR | India Feasibility |
|---|----------|--------|---------|-------------------|
| 1 | 4% Rule (Trinity Study) | USA | 3.5–4.5% | Moderate |
| 2 | Guyton-Klinger Guardrails | USA | 4.5–5.5% | Moderate |
| 3 | Vanguard Dynamic Spending | USA | 4.0–5.0% | Low |
| 4 | 3-Bucket Classic (HDFC) | India | 4.5–5.5% | High |
| 5 | India 4-Bucket SWP ⭐ | India | 5.5–7.0% | Very High |
| 6 | NPS + Annuity Hybrid | India | 5.0–6.0% | High |
| 7 | SCSS + PMVVY + FD Ladder | India | 5.5–6.5% | Very High |
| 8 | RMD-Based Withdrawal | USA | 3.5–6.0% | Not Applicable |
| 9 | TIPS Ladder | USA | 3.0–4.0% | Not Applicable |
| 10 | Constant Percentage | USA | 4.0–5.0% | Moderate |

### 6.2 The 20-Year Corpus Projection Chart

Multi-line Recharts visualisation showing the rupee corpus path for each strategy across 20 years. N/A strategies are hidden. Hovering a line highlights it and dims the others. Strategies that deplete are flagged with a red marker.

### 6.3 The Comparison Table

Sortable columns:

- **Strategy** — name with country flag
- **Safe WR** — midpoint of the strategy's safe withdrawal-rate range
- **Gross / mo** — monthly income at the safe WR (faded grey, for reference)
- **Net / mo (post-tax)** — your actual take-home after Indian tax. This is the headline number. A coloured tag below shows the tax drag percentage (green <5%, amber <15%, red ≥15%).
- **20-yr Corpus** — projected ending balance (depletion year shown if it happens)
- **Score / 60** — six-dimension composite
- **Verdict** — PASSES (score ≥ 40 and WR within safe range), PARTIAL (score 25–39), FAILS (score < 25 or fundamentally unsuited), N/A (instruments unavailable in India), or BEST FIT (highest passing score, starred)

Click any row to load the strategy's detailed card below the table.

### 6.4 The Six Score Dimensions

Each strategy is rated 1–10 on:

- **Achieves your target** — does the safe WR support your monthly draw?
- **Principal preservation** — does corpus survive 20 years?
- **Inflation protection** — does income keep pace with rising prices?
- **Tax efficiency** — what fraction of gross is lost to Indian tax?
- **India feasibility** — are the instruments available and practical here?
- **Simplicity** — how much effort does the strategy demand?

Each dimension auto-rebiases on your specific situation. For instance, the tax-efficiency score reflects the actual drag computed on your slab.

### 6.5 The Strategy Detail Card

When you select a strategy, a card opens below the table with:

- Origin and academic reference
- Plain-English description
- Verdict explanation
- Three mini-KPIs: safe WR range, your effective WR, total score
- Dimension-by-dimension breakdown with horizontal bars
- Pros and cons lists

---

## 7. The Buckets Tab — Detailed Allocation Controls

The Buckets tab is where you fine-tune the four-bucket allocation manually. Think of it as the "Plan" tab's advanced view.

### 7.1 Refill Alerts

If B1's runway drops below 12 months, an amber alert appears with a one-click refill button. The refill is sourced from B3 by default (per the V2 model), bringing B1 back to a 24-month buffer.

### 7.2 The Four Bucket Cards

Each bucket displays its rupee value, percentage of corpus, expected return, and (for B1) runway in months. Cards are colour-coded: blue (B1), teal (B2), violet (B3), orange (B4).

### 7.3 Sliders

- **Return assumptions** — set per-bucket expected CAGR. Defaults: B1 6.5%, B2 8.5%, B3 10%, B4 13%.
- **Bucket allocation percentages** — must sum to 100. Adjusting one slider proportionally rebalances the others.
- **Risk appetite** — 1 to 5; informational.
- **Tax bracket** — 0/5/10/20/30%; flows into the Tax tab.
- **Refresh interval** — 1 or 6 hours; controls how often market data refreshes.

---

## 8. The Simulate Tab — Stress Tests and Monte Carlo

The Simulate tab runs three different views of your plan's robustness.

### 8.1 Corpus Preservation

Performs a 60-iteration binary search to find the maximum monthly withdrawal where your corpus stays at or above the starting value for all 20 years (the strict preservation criterion). Shown in rupees per month, rounded to the nearest ₹500.

This number is your true "safe" withdrawal — if your target is below it, you have headroom; if above, you are dipping into principal even in a baseline scenario.

### 8.2 Monte Carlo Simulation

The headline robustness check. Two hundred (configurable up to one thousand) portfolio paths are generated by sampling per-year returns from a normal distribution per bucket, then running each path through the V2 refill-linked simulator with all guardrails active.

Outputs:

- **Success rate** — percentage of runs where corpus stays positive through the horizon. Good ≥85%, marginal 65–85%, poor <65%.
- **Median final corpus** — what you typically end with
- **Best case (90th percentile)** — top-decile outcome
- **Worst case (10th percentile)** — bottom-decile outcome
- **Earliest depletion year** — in the worst run, when the corpus hits zero
- **Fan chart** — Recharts area visualisation with p10–p90 outer band, p25–p75 inner band, and median line

The simulation runs synchronously in the main thread (50–150ms typical). You can re-run any number of times; each click produces a fresh sample.

### 8.3 Year-by-Year Simulator

A stepwise playback of the four-bucket cascade, year by year. Use the controls to step forward, step back, or auto-play at one second per year. At each step you see:

- Current bucket balances
- Annual withdrawal taken
- Growth earned per bucket
- Refill amounts (B3 → B1, B4 → B3)
- B4 harvest and the LTCG tax paid
- Total corpus at year-end

### 8.4 SWP Simulator

A 25-year line chart and detailed year-by-year table. Shows every transfer and balance for forensic review.

---

## 9. The Tax Tab — Indian Tax Engine

The Tax tab is the FY 2024-25 Indian tax engine. It applies LTCG, STCG, slab, and 80TTB rules to your specific instrument mix and shows you exactly where your tax goes.

### 9.1 Settings

Two controls at the top of the tab:

- **Slab** — your marginal income-tax rate (NIL / 5% / 10% / 20% / 30%)
- **Regime** — Old or New (FY 2024-25 rates)

The senior-citizen status (60+) is auto-detected from your demographics. Section 80TTB (₹50k bank-interest exemption) is applied if and only if you are senior.

### 9.2 Headline KPIs

Four tiles that update with every setting change:

- **Gross monthly** — total monthly income from your profile's instrument mix
- **Net monthly** — after tax
- **Effective tax rate** — weighted average across all instruments, expressed as a percentage of gross
- **25-year tax** — cumulative tax paid on the four-bucket strategy across the full horizon

### 9.3 Year-by-Year Sub-tab

Two tables:

**Per-tax-class breakdown** — annual gross income, tax, net, and applied rule for each tax class present in your profile. The total row shows the effective rate.

**25-year projection** — annual draw, slab tax, LTCG tax, total tax, and effective tax rate per year for the full horizon. Cumulative total at the bottom.

**Old vs New regime** — side-by-side card showing tax owed under each regime on your annual taxable income, with the cheaper option flagged. The new regime applies the ₹75k standard deduction; the old regime applies the ₹50k 80TTB if you are senior.

### 9.4 LTCG Optimiser Sub-tab

Indian tax law gives you a ₹1,25,000 annual exemption on equity LTCG. If you do not realise gains up to this amount each financial year, the exemption is lost — it does not roll over.

The optimiser shows:

- Year-by-year B4 value
- Auto-harvest amount the simulator naturally executes
- Recommended additional harvest (₹1,25,000 every March 31)
- Estimated tax saved (gains × 12.5%)
- Cumulative 10-year saving estimate

The action: every March 31, sell ₹1,25,000 of B4 equity-MF gains and immediately re-buy similar units. Zero tax that year. Cost basis steps up. Repeat annually. Over 25 years this saves approximately ₹3.9 lakh on a typical retiree portfolio.

### 9.5 Reshuffle Advice Sub-tab

Slab-aware suggestions that auto-update with your tax bracket. Each carries a priority (high / medium / low) and an estimated saving where calculable.

Common suggestions:

- **At 20% slab and above** — switch debt-MF SWP to equity arbitrage funds. Debt MFs bought after April 2023 are taxed at slab; arbitrage funds (>65% equity hedged) qualify for LTCG. The differential is roughly 120 basis points of post-tax yield.
- **At any slab above 5%** — realise ₹1.25 lakh of LTCG every March 31 (see optimiser).
- **For senior citizens** — park ₹6.25L+ of debt allocation in SCSS rather than bank FD. SCSS pays 8.2% (vs ~7.9% senior FD), is exempt from TDS up to ₹30L, and qualifies for 80C.
- **Anyone** — use 80TTB to keep ₹50k of bank/post-office interest tax-free if senior.
- **At 30% slab** — avoid PMVVY for large amounts; SCSS plus RBI Floating Rate Bonds gives a 30bps yield advantage.
- **Anyone** — hold international FoFs in the spouse's account if they are in a lower slab (subject to clubbing rules).
- **Anyone** — use March 31 to harvest both LTCG (gains) and offset debt-MF losses against each other.

---

## 10. Methodology

### 10.1 The Refill-Linked Simulator

The core simulation runs in `simulateRefillLinked` (`src/lib/refillStrategy.ts`). For each of 25 years:

1. Apply per-bucket return (or a sampled return in Monte Carlo mode).
2. Compute total post-growth corpus. Apply guardrail rules:
   - If corpus < 70% of initial: cut next withdrawal by 10%, freeze inflation.
   - If corpus < 85% of initial: freeze inflation only.
3. Withdraw the inflation-adjusted target from B1 first, then B3, then B4 (skipping B4 if its return that year was negative). If all three are exhausted, record the unmet amount as `shortfall`.
4. Refill B1 from B3 to a two-year buffer.
5. Run the harvest decision: if B4 return ≥ 12% or B3 cover < 6 years, redeem some B4 into B3, paying LTCG tax above the ₹1.25L exemption.
6. If total corpus has dropped to zero, halt early.

The simulator returns a row per year with all balances, transfers, returns, shortfalls, and a `corpusBelowInitial` flag.

### 10.2 The Verdict Engine

For every strategy and the user's plan, we compute:

- **Baseline projection** — runs the strategy's specific simulator on the user's corpus and target.
- **Stress test** — replays the simulation with a 35% B4 shock injected in year 5.

A plan is **Achievable** only if both projections succeed. **Achievable with adjustments** if the baseline holds but the stress test fails (or the corpus dips below initial in the baseline). **Not Achievable** if any year shows shortfall or depletion.

When the verdict is "with adjustments" or "not achievable", the engine populates an `adjustments` list. Two suggestions are common:

- Reduce monthly withdrawal to the binary-searched maximum sustainable rate.
- Boost corpus by the binary-searched minimum viable amount.

### 10.3 The Six-Dimension Score

Each strategy starts with PDF-anchored baseline scores for the six dimensions. Two are dynamically rebiased on the user's situation:

- **Achieves target** — boosted if WR is within the safe range; cut if WR exceeds it.
- **Principal preservation** — set from the actual final-corpus-to-starting-corpus ratio.
- **Tax efficiency** — set from the actual computed post-tax factor.

The total is summed (max 60). Verdict thresholds: PASSES at 40+, PARTIAL at 25–39, FAILS below 25.

### 10.4 The Tax Engine

Each instrument is classified into one of seven tax classes. For each class, an annual tax computation respects:

- **Equity LTCG** — first ₹1.25L exempt; remainder at 12.5%.
- **Section 80TTB** — first ₹50k of bank interest exempt for seniors only.
- **Slab rates** — old or new regime; senior-citizen brackets where applicable; 4% cess.
- **Cumulative LTCG tracking** — prevents double-counting the exemption when multiple equity instruments contribute in the same year.

The total tax across all classes is divided by gross annual income to produce the effective tax rate.

### 10.5 Monte Carlo

Per-bucket annual returns are sampled from a normal distribution `N(μ, σ)`:

| Bucket | Mean (μ) | Std-Dev (σ) |
|--------|----------|-------------|
| B1 | 6.5% | 0.5% |
| B2 | 8.5% | 1.5% |
| B3 | 10.0% | 8.0% |
| B4 | 13.0% | 18.0% |

Samples use Box-Muller transformation. Each path runs through the full guardrail-aware simulator. We aggregate yearly values across runs into percentile bands and compute success rate as the fraction of runs that complete the horizon with a positive balance.

---

## 11. Glossary

- **Annual Withdrawal Rate (WR)** — annual draw divided by current corpus, expressed as a percentage. The safe rate depends on the strategy.
- **B1, B2, B3, B4** — the four buckets. B1 is the cash buffer; B2 is the fixed-income floor; B3 is the SWP source; B4 is the growth engine.
- **BAF** — Balanced Advantage Fund. A SEBI category that dynamically shifts between equity and debt based on valuation signals.
- **Cascade** — the order of money flows in the simulation: B4 → B3 → B1 (with B2 untouched).
- **CAGR** — Compound Annual Growth Rate.
- **Cess** — 4% Health and Education Cess applied on top of all income-tax components in India.
- **Corpus** — the rupee amount earmarked for retirement income.
- **Depletion** — the year your corpus hits zero. The simulation halts immediately when this happens.
- **EEE** — Exempt-Exempt-Exempt. A tax status (PPF) where contribution, growth, and withdrawal are all exempt.
- **FIRE** — Financial Independence, Retire Early. A community-defined approach to early retirement.
- **Guyton-Klinger** — a dynamic withdrawal framework that adjusts spending based on portfolio performance.
- **Inflation freeze** — a guardrail that suspends the year-over-year inflation increase on next year's draw when the corpus has fallen below 85% of starting value.
- **LTCG** — Long-Term Capital Gains. For Indian equity, applied to gains realised after twelve months of holding.
- **Monte Carlo** — a simulation technique that runs many random paths to estimate the probability distribution of outcomes.
- **PMVVY** — Pradhan Mantri Vaya Vandana Yojana. A LIC pension scheme for senior citizens.
- **POMIS** — Post Office Monthly Income Scheme.
- **REIT** — Real Estate Investment Trust. Listed property vehicles like Embassy and Mindspace.
- **Refill** — a transfer between buckets that maintains the cash buffer or replenishes the SWP source.
- **Risk profile** — one of five investor classifications used to set the bucket allocation and instrument mix.
- **Safe WR** — the highest withdrawal rate that historical or simulated data shows survives the horizon with high probability.
- **SCSS** — Senior Citizens' Savings Scheme. A Government of India scheme paying 8.2% (FY 2024-25) with a ₹30 lakh cap per individual.
- **Sequence-of-returns risk** — the danger that early-retirement losses, even if recoverable in absolute terms, permanently impair a withdrawing portfolio.
- **Slab** — your marginal income-tax bracket (5%, 10%, 20%, or 30%).
- **STCG** — Short-Term Capital Gains. For Indian equity (held under 12 months), 20%.
- **Stress test** — replaying the plan against a fixed adverse scenario (35% B4 crash in year 5).
- **SWP** — Systematic Withdrawal Plan. A scheduled redemption from a mutual fund or instrument.
- **TIPS** — Treasury Inflation-Protected Securities. US-only instrument; not available in India.
- **80TTB** — Section 80TTB of the Income-Tax Act. Provides senior citizens a ₹50,000 deduction on bank/post-office interest income.

---

## 12. Frequently Asked Questions

### How accurate are the projections?

Within the assumed return distributions and tax rules, the projections are deterministic for the baseline and probabilistic for Monte Carlo. They are not predictions; they are scenarios. Any single observed outcome over your real 20-year retirement may deviate substantially from any single simulated path. The Monte Carlo success rate is the most honest single number — it tells you what fraction of simulated futures the plan survives.

### Why does the tool prefer the four-bucket strategy?

Because, on Indian return assumptions plus Indian tax treatment plus Indian fund availability, the four-bucket refill-linked strategy with guardrails delivers the highest combination of (a) sustained inflation-adjusted income, (b) preserved principal, and (c) tax efficiency across a 20-year horizon. The Compare tab demonstrates this empirically — the strategy ends with ₹2.35 Cr from a ₹1 Cr starting corpus while the SCSS-only plan ends with ₹18 L of real-terms purchasing power.

### Can I use this tool without taking the risk quiz?

Yes. The Profile tab allows direct selection of any of the five profiles by clicking "Choose this" on the corresponding column. The quiz is a recommendation aid, not a gating step.

### How do I export my plan?

Click **Export** in the top-right of the header. The tool generates a multi-page PDF containing your inputs, the year-by-year simulation table, and key statistics. The PDF is generated entirely in your browser; no data leaves your device.

### What happens to my data when I close the browser?

Your inputs and results are stored in your browser's local storage. They persist across page reloads and browser restarts. They are erased if you clear browser data, use private/incognito mode, or click the Reset button in the header.

### Can I share my plan with my advisor or spouse?

Yes — the most reliable way is the PDF export. The URL itself does not contain your data, so simply sending the link does not share your plan.

### Does the tool handle joint retirement (spouse income, joint life expectancy)?

Partially. The Plan tab accepts spouse age and spouse life expectancy. The simulation horizon is set to the longer of the two. SIP/passive income on the Plan tab can be used to enter ongoing spouse earnings. Joint pension calculations and survivor benefits are not yet modelled — verify with a CA.

### What does "Best Fit" mean exactly?

The strategy with the highest total score that also passes all gates (score ≥40, WR within safe range, India-feasible, baseline non-depleting). Only one strategy receives this designation per recalculation. The star and blue tint flag it on both the Compare table and the chart.

### Why are some strategies marked "Not Applicable"?

Two of the ten strategies — RMD-Based Withdrawal and TIPS Ladder — depend on US-specific instruments or regulations that have no functional equivalent in India. They are shown in grey for completeness; they cannot be the Best Fit.

### Can I edit the recommended fund list?

The fund list is curated from the academic reference and the AMFI master list, with funds chosen for AUM > ₹500 Cr and track record > 3 years. The list is hard-coded; you cannot edit it within the tool. Treat the recommendations as starting points; verify NAV, AUM, and expense ratios at the time of investment.

---

## 13. Limitations and Disclaimers

### 13.1 What this tool is not

- **Not financial advice.** This is an analytical tool. Every recommendation must be validated by a SEBI-registered investment advisor or a Chartered Accountant before acting on it.
- **Not tax preparation.** The tax engine applies FY 2024-25 rates and standard rules; it does not handle every personal deduction (80C, 80D, HRA, home-loan, depreciation), capital gains roll-overs, foreign assets, or business income.
- **Not real-time.** AMFI NAVs and FD rates shown in the tool are cached and may be out of date by hours. Always verify current rates with the AMC or bank before transacting.
- **Not a transaction platform.** The tool plans; it does not buy, sell, or rebalance any instrument on your behalf.

### 13.2 Modelling assumptions

- Returns are constant (deterministic baseline) or normally distributed (Monte Carlo). Real markets have fat tails, regime shifts, and correlation breakdowns that no normal distribution captures.
- Inflation rates are constant (general 6.5%, healthcare 10%, education 12%). Actual Indian CPI varies year by year.
- The tax engine assumes you remain an Indian resident throughout retirement. Non-resident status (NRO/NRE accounts, FEMA implications) is not modelled.
- The simulator does not model rebalancing costs, exit loads, fund-switching tax events, or transaction charges.
- LTCG harvest timing assumes a clean March-31 redemption-and-rebuy. The tool does not warn you about wash-sale rules (India does not have one, but long-term holding period restarts on rebuy).
- The 35% stress test is a single adverse scenario. Real bear markets vary in depth, duration, and composition; the tool does not run multi-asset crashes (e.g., 2020 where bonds and equity both fell briefly).

### 13.3 Data privacy

All computation runs in your browser. The tool sends your inputs to the API only when (a) you opt into the V2 chat-first AI flow (`?v2=1` URL parameter) and (b) explicitly click "Generate my plan" on the chat screen. The default V1 dashboard makes no API calls; it is entirely client-side.

### 13.4 Software licence

This tool is provided "as is" without warranty of any kind. By using it, you accept that the author and maintainers are not liable for any financial outcome derived from acting on its outputs.

### 13.5 Update cadence

Tax rates, scheme rates, and the curated fund list are reviewed annually after the Union Budget. Material algorithmic changes (allocation defaults, simulator logic, scoring) are version-stamped. The current version is shown in the header of this document.

---

*End of User Manual — Version 2.0, April 2026*
