---
marp: true
theme: default
paginate: true
size: 16:9
backgroundColor: #ffffff
color: #1f2937
header: 'Indian Retirement Planner  ·  Version 2.0'
footer: 'Confidential  ·  April 2026'
style: |
  /* ── Corporate palette ───────────────────────────────────── */
  /* Navy   #1B2951  ·  Charcoal #1F2937  ·  Gold #B8956A     */
  /* Slate  #475569  ·  Border  #E2E8F0  ·  Surface #F8FAFC   */

  section {
    font-family: 'Inter', 'Helvetica Neue', 'Arial', sans-serif;
    padding: 64px 80px 56px 80px;
    font-size: 22px;
    color: #1F2937;
    line-height: 1.5;
    position: relative;
  }
  section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: #1B2951;
  }
  header {
    color: #94A3B8;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 500;
    padding: 0 80px;
    top: 16px;
  }
  footer {
    color: #94A3B8;
    font-size: 11px;
    letter-spacing: 0.05em;
    padding: 0 80px;
    bottom: 16px;
  }
  section::after {
    color: #94A3B8 !important;
    font-size: 11px;
    letter-spacing: 0.05em;
    bottom: 16px;
    right: 80px;
  }

  /* ── Title slide ─────────────────────────────────────────── */
  section.lead {
    background: #FFFFFF;
    color: #1B2951;
    text-align: left;
    padding: 96px 96px 80px 96px;
    justify-content: flex-start;
  }
  section.lead::before { background: #B8956A; height: 8px; }
  section.lead header,
  section.lead footer,
  section.lead::after { display: none; }
  section.lead h1 {
    font-size: 64px;
    font-weight: 300;
    letter-spacing: -1.5px;
    color: #1B2951;
    margin: 0 0 8px 0;
    line-height: 1.05;
  }
  section.lead h1 strong { font-weight: 700; }
  section.lead h2 {
    font-size: 22px;
    font-weight: 400;
    color: #475569;
    margin: 0;
    letter-spacing: 0.2px;
  }
  section.lead .meta {
    position: absolute;
    bottom: 80px;
    left: 96px;
    right: 96px;
    border-top: 1px solid #E2E8F0;
    padding-top: 24px;
    color: #64748B;
    font-size: 14px;
    display: flex;
    justify-content: space-between;
  }
  section.lead .meta strong { color: #1B2951; font-weight: 600; }

  /* ── Section dividers ────────────────────────────────────── */
  section.section {
    background: #FFFFFF;
    text-align: left;
    padding: 96px 96px 80px 96px;
    justify-content: flex-start;
  }
  section.section::before { background: #B8956A; height: 8px; }
  section.section .label {
    font-size: 12px;
    color: #B8956A;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  section.section h1 {
    font-size: 56px;
    color: #1B2951;
    font-weight: 300;
    letter-spacing: -1px;
    margin: 0 0 24px 0;
    line-height: 1.1;
  }
  section.section h1 strong { font-weight: 700; }
  section.section p {
    font-size: 18px;
    color: #475569;
    max-width: 640px;
    margin: 0;
  }
  section.section header,
  section.section footer,
  section.section::after { display: none; }
  section.section .rule {
    width: 80px;
    height: 2px;
    background: #B8956A;
    margin: 24px 0;
  }

  /* ── Headings ────────────────────────────────────────────── */
  h1 {
    color: #1B2951;
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin: 0 0 24px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #E2E8F0;
    position: relative;
  }
  h1::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 48px;
    height: 2px;
    background: #B8956A;
  }
  h2 {
    color: #1B2951;
    font-size: 22px;
    font-weight: 600;
    margin: 24px 0 12px 0;
  }
  h3 {
    color: #1F2937;
    font-size: 18px;
    font-weight: 600;
    margin: 16px 0 8px 0;
  }
  strong { color: #1B2951; font-weight: 600; }
  em { color: #475569; }

  /* ── Body ────────────────────────────────────────────────── */
  p, li {
    color: #334155;
  }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 8px; }
  li::marker { color: #B8956A; }

  /* ── Tables ──────────────────────────────────────────────── */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    font-size: 17px;
    border-top: 2px solid #1B2951;
    border-bottom: 1px solid #1B2951;
  }
  th {
    background: transparent;
    color: #1B2951;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #1B2951;
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
  }
  tr:last-child td { border-bottom: none; }
  td strong { color: #1B2951; }

  /* ── Blockquote (pull quotes) ────────────────────────────── */
  blockquote {
    border-left: 3px solid #B8956A;
    padding: 4px 0 4px 20px;
    color: #1B2951;
    font-style: normal;
    font-size: 19px;
    font-weight: 500;
    margin: 24px 0;
    line-height: 1.45;
  }
  blockquote strong { color: #1B2951; }

  /* ── Layout helpers ──────────────────────────────────────── */
  .twocol {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin: 16px 0;
  }
  .threecol {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    margin: 16px 0;
  }
  .kpi {
    background: #F8FAFC;
    border-left: 3px solid #B8956A;
    padding: 18px 22px;
  }
  .kpi .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748B;
    font-weight: 600;
  }
  .kpi .value {
    font-size: 30px;
    font-weight: 700;
    color: #1B2951;
    margin-top: 6px;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }
  .kpi .value.small { font-size: 20px; }
  .kpi .hint {
    font-size: 13px;
    color: #64748B;
    margin-top: 6px;
  }

  /* ── Code (used for ASCII diagrams) ──────────────────────── */
  pre, code {
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    color: #1F2937;
    font-size: 14px;
    line-height: 1.5;
  }
  pre {
    padding: 16px 20px;
    border-radius: 2px;
  }
  code { padding: 2px 6px; font-size: 0.9em; }
---

<!-- _class: lead -->

# Indian Retirement <strong>Planner</strong>

## A four-bucket withdrawal strategy with guardrails, tax optimisation, and 10-strategy comparison

<div class="meta">
  <div><strong>Version 2.0</strong> &nbsp;·&nbsp; April 2026</div>
  <div>finance-liart-nine.vercel.app</div>
</div>

---

<!-- _class: section -->

<div class="label">Part One</div>

# The <strong>problem</strong>

<div class="rule"></div>

Indian retirees face structural pressures the global "4% rule" was never designed for. Most retail planning tools ignore inflation, tax, and crash resilience.

---

# The Indian retirement income challenge

Indian retirees face a unique combination of pressures the standard playbook does not address.

- **Inflation that eats principal.** General CPI ~6.5%; healthcare ~10%; education ~12%. A monthly need of ₹60,000 today becomes **₹2,07,000** by year 20.
- **Tax structure that favours equity over debt.** Debt mutual funds are taxed at slab; equity LTCG only 12.5% above the ₹1.25L annual exemption.
- **Limited safe-yield products.** SCSS capped at ₹30L per individual; PMVVY at 7.4%; bank FDs at ~7.9% — all taxable at slab.
- **Sequence-of-returns risk.** A 35% market crash in year 5 of retirement permanently impairs even a "well-funded" plan unless the strategy adapts dynamically.

> The standard playbook of "park it in FDs and SCSS" delivers a flat nominal income that loses **two-thirds of its real purchasing power** by year 20.

---

# What existing tools get wrong

| Approach | Critical Gap |
|----------|--------------|
| 4% Rule | Built on US 60/40 portfolio assumptions. Ignores Indian inflation differential. |
| Pure debt (SCSS + FD ladder) | No inflation hedge. Real principal value collapses by year 20. |
| Pure equity SWP | No buffer for sequence-of-returns risk. One bad year can cripple decades. |
| Generic SIP calculators | Compute accumulation phase only, not the withdrawal phase. |
| AMC-provided 3-Bucket | Conservative endpoint. No equity refill engine to outpace inflation. |

This tool encodes the academic **four-bucket refill-linked strategy with guardrails** — purpose-built for Indian retirees and validated empirically against ten alternative frameworks.

---

<!-- _class: section -->

<div class="label">Part Two</div>

# The <strong>tool</strong>

<div class="rule"></div>

A browser-based application. Inputs at the top, simulation in the middle, recommendations at the bottom. Fully client-side.

---

# What it does

<div class="twocol">

<div>

### Inputs

- Total corpus
- Target monthly income
- Demographics — age, life expectancy, city
- Expense breakdown — four categories with dual inflation curves
- Risk profile via 10-question quiz
- Tax slab and regime selection
- Withdrawal frequency

</div>

<div>

### Outputs

- 25-year projection of corpus and income
- Monte Carlo success probability (200 paths)
- 10-strategy head-to-head scorecard
- 5-profile side-by-side allocation
- Year-by-year tax breakdown, FY 2024-25
- LTCG harvesting schedule
- Slab-aware reshuffle advice
- Exportable PDF report

</div>

</div>

---

# Architecture

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 + Vite 6 | Fast SPA, minimal overhead |
| Language | TypeScript 5.6 strict | Type safety for financial computations |
| Styling | Tailwind CSS 3.4 | Mobile-first, utility-driven |
| Charts | Recharts 2.13 | Lazy-loaded for performance |
| State | Browser localStorage | Fully client-side; no backend |
| Hosting | Vercel | Static SPA, free tier |

> **Privacy by design.** Every calculation runs in your browser. No personal financial data leaves your device. There is no account, no login, no telemetry on your inputs.

---

<!-- _class: section -->

<div class="label">Part Three</div>

# Core <strong>concepts</strong>

<div class="rule"></div>

The four buckets, the refill chain, the guardrails, and the Indian tax treatment that makes this strategy work.

---

# The four buckets

| Bucket | Horizon | Role | Default | Sample Instruments |
|--------|---------|------|---------|---------------------|
| **B1** Liquidity | 0–2 years | Cash buffer for monthly draws | 10% | Liquid funds, overnight, arbitrage |
| **B2** Fixed Floor | 5-year ladder | Principal protection — never drained | 20% | SCSS, PMVVY, RBI bonds, FD |
| **B3** Stability | 5–10 years | SWP source | 25% | Balanced Advantage, aggressive hybrid |
| **B4** Growth | 10+ years | Refill engine | 45% | Flexi-cap, midcap, gold ETF, REIT |

Each bucket has a different time horizon, risk profile, and behaviour during a crash. The buckets work as a **system** — the value of any one depends on the others.

---

# The refill chain

```
   ┌────────────┐    annual harvest   ┌────────────┐    refill to       ┌────────────┐
   │     B4     │────when ≥ 12% ─────▶│     B3     │────two-year ─────▶│     B1     │
   │   Growth   │   (LTCG-aware)      │  Stability │     buffer         │  Liquidity │
   └────────────┘                     └────────────┘                    └────────────┘
                                                                              │
                                                                              ▼
                                      ┌────────────┐                 monthly withdrawal
                                      │     B2     │
                                      │   Fixed    │ ◀── held to 5-year maturity, untouched
                                      │   Floor    │
                                      └────────────┘
```

**Draw priority** B1 → B3 → B4. In any year B4 returns ≤ 0%, the harvest is **skipped** — equity is never sold at a loss. This is the heart of the model.

---

# Guardrails — surviving a 30-40% crash

| Trigger | Rule | Effect |
|---------|------|--------|
| Corpus < 85% of starting | Inflation freeze | Next year's draw not increased for inflation |
| Corpus < 70% of starting | 10% cut + freeze | Next year's draw reduced by 10% |
| B4 annual return ≤ 0% | No-loss harvest | B4 → B3 transfer skipped entirely |
| B4 annual return ≥ 12% | Aggressive refill | 25% of B4 gain harvested into B3 |
| B3 cover < 6 years SWP | Forced rebalance | B4 → B3 even on modest equity returns |

> Every plan is replayed against a one-time **35% B4 crash in year 5** — the worst sequence-of-returns timing. Plans must survive this stress test to earn a "PASSES" verdict.

---

# Indian tax treatment, FY 2024-25

| Class | Examples | Rule |
|-------|----------|------|
| Equity LTCG | Equity MF, BAF, flexi-cap | 12.5% on gains > ₹1.25L per year |
| Debt MF (slab) | Corporate bond, short duration, liquid | Slab rate on **all** gains, post-Apr 2023 |
| Interest (slab) | SCSS, PMVVY, RBI bonds, POMIS | Slab rate on interest income |
| Bank int. (80TTB) | Bank FD, savings, post office (senior 60+) | Slab rate, less ₹50,000 exemption |
| Tax-free | PPF | EEE — fully exempt |
| REIT mixed | Embassy, Mindspace | ~50% slab + 50% LTCG (verify with CA) |
| NPS annuity | Annuity payouts post-60 | Slab rate on annuity portion |

The tool applies these rules per-instrument, per-year, with cumulative LTCG exemption tracking across all equity holdings.

---

<!-- _class: section -->

<div class="label">Part Four</div>

# Five risk <strong>profiles</strong>

<div class="rule"></div>

A 10-question quiz, five named profiles, side-by-side comparison on a single page.

---

# The five profiles

| Profile | Score Range | Equity % | Yr-1 Income | Yr-20 Corpus from ₹1Cr |
|---------|------------:|---------:|------------:|-----------------------:|
| Ultra-Conservative | 10–19 | ~12% | ₹55,668 | ₹18 L (real-terms) |
| Conservative | 20–27 | ~17% | ₹60,000 | ₹35 L |
| **Moderate** (recommended) | 28–35 | ~57% | ₹60,000 | **₹2.35 Cr** |
| Moderately Aggressive | 36–43 | ~57% | ₹58,000 | ₹3.20 Cr |
| Aggressive / FIRE | 44–50 | ~78% | ₹50,000 | ₹4.50 Cr |

> The Moderate profile is the recommended default for most Indian retirees with a 20-year-plus horizon. The quiz match is non-binding — any profile can be selected manually.

---

# Side-by-side comparison

The Profile tab shows all five profiles **on a single page**, each in its own demarcated column.

- **Allocation bar** — colour-coded share of B1 / B2 / B3 / B4 with equity percentage
- **Three KPIs** — Year-1 monthly income, Year-10 monthly income, Year-20 corpus (green when corpus exceeds starting amount)
- **Top strengths and trade-offs** — two of each
- **Best for** — one-line target audience description
- **Instrument list** — 8–10 funds with bucket, category, expected CAGR, and rupee allocation scaled to your corpus

The matched profile is highlighted with a thin top-border, a "YOU" badge, and a tinted background. The other four remain visible for comparison and override.

---

# The Moderate profile in detail

**Allocation** B1 10% · B2 20% · B3 25% · B4 45%
**Year-1** ₹60,000/mo · **Year-10** ₹92,000/mo · **Year-20 corpus** ₹2.35 Cr from ₹1 Cr

| Bucket | Instrument | Allocation | Monthly | Tax Class |
|--------|-----------|-----------:|--------:|-----------|
| B2 | SCSS @ 8.2% | ₹30 L | ₹20,500 | Interest (slab) |
| B2 | HDFC Short Duration SWP | ₹10 L | ₹6,250 | Debt MF (slab) |
| B3 | ICICI Equity & Debt | ₹15 L | ₹8,500 | Equity LTCG |
| B3 | Mirae Asset Balanced Advantage | ₹10 L | ₹5,500 | Equity LTCG |
| B4 | Parag Parikh Flexi Cap | ₹10 L | refill | Equity LTCG |
| B4 | UTI / HDFC Nifty 50 Index | ₹10 L | refill | Equity LTCG |
| B4 | Mirae Emerging Bluechip | ₹10 L | refill | Equity LTCG |

---

<!-- _class: section -->

<div class="label">Part Five</div>

# Ten-strategy <strong>comparison</strong>

<div class="rule"></div>

Same corpus. Same monthly target. Same tax slab. Ten different frameworks, scored side-by-side.

---

# The ten frameworks

| # | Strategy | Origin | Safe WR | India Fit |
|---|----------|--------|---------|-----------|
| 1 | 4% Rule (Trinity Study) | USA | 3.5–4.5% | Moderate |
| 2 | Guyton-Klinger Guardrails | USA | 4.5–5.5% | Moderate |
| 3 | Vanguard Dynamic Spending | USA | 4.0–5.0% | Low |
| 4 | 3-Bucket Classic (HDFC) | India | 4.5–5.5% | High |
| 5 | **India 4-Bucket SWP** (recommended) | India | 5.5–7.0% | Very High |
| 6 | NPS + Annuity Hybrid | India | 5.0–6.0% | High |
| 7 | SCSS + PMVVY + FD Ladder | India | 5.5–6.5% | Very High |
| 8 | RMD-Based Withdrawal | USA | 3.5–6.0% | Not Applicable |
| 9 | TIPS Ladder | USA | 3.0–4.0% | Not Applicable |
| 10 | Constant Percentage | USA | 4.0–5.0% | Moderate |

---

# How strategies are scored

Each strategy is rated **1 to 10** on six dimensions, summed for a max of 60.

<div class="twocol">

<div>

- **Achieves your target** — is the safe WR enough?
- **Principal preservation** — does corpus survive 20 years?
- **Inflation protection** — does income keep pace?

</div>

<div>

- **Tax efficiency** — slab vs LTCG drag
- **India feasibility** — instrument availability
- **Simplicity** — annual management effort

</div>

</div>

### Verdicts

- **PASSES** — score ≥ 40 AND withdrawal rate within strategy's safe range
- **PARTIAL** — score 25–39 OR WR slightly above safe range
- **FAILS** — score < 25 OR fundamentally unsuited
- **NOT APPLICABLE** — instruments unavailable in India
- **BEST FIT** — single highest-scoring strategy that fully passes

---

# Case study — ₹1 Cr corpus, ₹60,000/month, 20% slab

| Strategy | Net / mo | 20-yr Corpus | Score | Verdict |
|----------|---------:|-------------:|------:|---------|
| **India 4-Bucket SWP** | **₹52,800** | **₹2.35 Cr** | **51 / 60** | **BEST FIT** |
| 3-Bucket Classic (HDFC) | ₹50,200 | ₹60 L | 42 / 60 | PASSES |
| Guyton-Klinger Guardrails | ₹48,500 | ₹85 L | 39 / 60 | PARTIAL |
| SCSS + PMVVY + FD Ladder | ₹46,800 | ₹18 L | 37 / 60 | PARTIAL |
| 4% Rule (Trinity) | ₹44,200 | depleted yr 19 | 30 / 60 | FAILS |
| TIPS Ladder | — | — | — | N/A |

> Same gross income. Very different post-tax outcomes. Tax drag varies from **3% to 17%** across strategies — the choice of strategy matters as much as the choice of fund.

---

<!-- _class: section -->

<div class="label">Part Six</div>

# Stress <strong>testing</strong>

<div class="rule"></div>

Markets are not deterministic. The plan must survive sequence-of-returns risk.

---

# Monte Carlo simulation

The Simulate tab runs **200 random portfolio paths** through the full guardrail-aware simulator. Per-bucket annual returns are sampled from a normal distribution.

| Bucket | Mean μ | Standard Deviation σ |
|--------|--------|----------------------|
| B1 (liquid) | 6.5% | 0.5% |
| B2 (fixed-income) | 8.5% | 1.5% |
| B3 (hybrid) | 10.0% | 8.0% |
| B4 (equity) | 13.0% | 18.0% |

**Outputs** — success rate, median final corpus, p10/p90 bands, earliest depletion year, and a fan chart visualisation.

> A robust plan shows ≥ 85% success rate. 65–85% is marginal. Below 65% requires a structural pivot — increase corpus, reduce draw, or shift to a more conservative profile.

---

# Reading the fan chart

The Recharts area visualisation has three layers.

<div class="threecol">

<div class="kpi">
<div class="label">p10 to p90 Band</div>
<div class="value small">Outer Range</div>
<div class="hint">Light blue. 80% of futures fall within this envelope.</div>
</div>

<div class="kpi">
<div class="label">p25 to p75 Band</div>
<div class="value small">Likely Range</div>
<div class="hint">Mid blue. 50% of futures fall within this narrower envelope.</div>
</div>

<div class="kpi">
<div class="label">Median Line</div>
<div class="value small">Central Path</div>
<div class="hint">Dark navy. Half of futures land above, half below.</div>
</div>

</div>

> **Rule of thumb** — if the p10 line stays above zero through your life expectancy, the plan is robust. If it dips below zero before age 80, increase B2 allocation or reduce monthly draw.

---

<!-- _class: section -->

<div class="label">Part Seven</div>

# Tax <strong>engine</strong>

<div class="rule"></div>

Indian tax law applied per-instrument, per-year, with cumulative LTCG tracking and Old vs New regime comparison.

---

# Year-by-year tax projection

The Tax tab projects 25 years of tax for the four-bucket strategy. Sample on a ₹1 Cr corpus, ₹60,000/month, 20% slab, senior citizen.

| Year | Annual Draw | Slab Tax | LTCG Tax | Total Tax | Effective Rate |
|-----:|------------:|---------:|---------:|----------:|---------------:|
| 1 | ₹7.20 L | ₹18,500 | ₹0 | ₹18,500 | 2.6% |
| 5 | ₹9.16 L | ₹26,400 | ₹4,700 | ₹31,100 | 3.4% |
| 10 | ₹12.55 L | ₹38,200 | ₹14,300 | ₹52,500 | 4.2% |
| 15 | ₹17.20 L | ₹56,300 | ₹26,700 | ₹83,000 | 4.8% |
| 20 | ₹23.43 L | ₹84,000 | ₹47,200 | ₹1,31,200 | 5.6% |
| | | | | **₹17.4 L total over 25 years** | |

---

# Old vs New regime, side by side

The tool runs both regimes on your annual taxable income and flags the cheaper option for **your specific senior-citizen status**.

| | Old Regime | New Regime |
|---|------------|------------|
| Standard deduction | None | ₹75,000 |
| Section 80TTB (senior) | ₹50,000 | Not available |
| Section 80C / 80D | Available | Not available |
| Slab rates | Higher rates, more deductions | Lower rates, fewer deductions |
| **Crossover point** | Lower-income retirees with deductions | Higher-income retirees without deductions |

> The decision is rarely intuitive. The tool runs both side-by-side and shows the rupee saving — typically ₹15,000 to ₹80,000 per year either way, depending on profile.

---

# LTCG harvesting optimiser

Indian tax law gives you a **₹1,25,000 annual LTCG exemption**. Unrealised, this exemption is **lost** — it does not roll over.

### The action — every March 31

1. Sell ₹1,25,000 of B4 equity-MF gains, choosing units with the highest unrealised gain
2. Immediately re-buy similar units to maintain allocation
3. Cost basis steps up at zero tax that year
4. Repeat annually

<div class="kpi" style="text-align: center; max-width: 520px; margin: 32px auto 0;">
<div class="label">Estimated cumulative tax saved</div>
<div class="value">₹3.9 L</div>
<div class="hint">on a ₹1 Cr starting corpus, 13% B4 CAGR, 25-year horizon</div>
</div>

---

# Reshuffle advice — slab-aware

The Tax tab generates 6–7 slab-specific recommendations that update with your bracket. Sample for a 30% slab senior citizen.

| Priority | Action | Estimated Saving |
|----------|--------|------------------|
| High | Switch debt-MF SWP to equity arbitrage funds | ~120bps post-tax yield |
| High | Realise ₹1.25L LTCG every March 31 | ~₹3.9L over 25 years |
| High | Park debt allocation in SCSS, not bank FD | 30bps yield + 80C deduction |
| Medium | Use 80TTB ₹50k exemption fully | ~₹15,000 per year |
| Medium | Avoid PMVVY for large amounts; SCSS + RBI bonds | 30bps yield advantage |
| Medium | Use March 31 for LTCG harvest + debt-MF loss offset | Variable |
| Low | Hold international FoFs in lower-slab spouse account | Subject to clubbing rules |

---

<!-- _class: section -->

<div class="label">Part Eight</div>

# <strong>Methodology</strong>

<div class="rule"></div>

Reproducible logic. Every number traceable to its source.

---

# The refill-linked simulator

```
for each year y from 1 to 25:
  apply per-bucket return — deterministic or sampled
  compute totalCorpus

  // Guardrails
  if totalCorpus < 0.70 × initial:  cut next draw 10%, freeze inflation
  elif totalCorpus < 0.85 × initial:  freeze inflation only

  // Withdrawal
  draw from B1, then B3, then B4 — skip B4 if its return ≤ 0
  record any unmet amount as shortfall

  // Refill chain
  refill B1 from B3 to a 2-year buffer
  if B4 return ≥ 12% OR B3 cover < 6 years:
    redeem some B4 → B3, paying LTCG above ₹1.25L exemption

  if totalCorpus ≤ 0:  halt early
```

A single deterministic run completes in ~2ms. Monte Carlo with 200 paths in ~100ms.

---

# Verdict engine

A plan is **Achievable** only if all three gates are satisfied.

- Baseline projection completes 25 years without shortfall
- Stress test (35% B4 shock in year 5) also completes 25 years
- Score ≥ 40 AND withdrawal rate within strategy's safe range

**Achievable with adjustments** — baseline holds but stress test fails OR corpus dips below initial.

**Not Achievable** — any year shows shortfall or depletion in baseline.

When the verdict is "with adjustments" or "not achievable", the engine populates an `adjustments` list — typically *"reduce monthly withdrawal to ₹X"* (the binary-searched maximum sustainable rate) or *"boost corpus by ₹Y"* (the binary-searched minimum viable amount).

---

# Implementation modules

| Module | File | Lines |
|--------|------|------:|
| 4-bucket simulator | `src/lib/refillStrategy.ts` | ~400 |
| Strategy comparison engine | `src/lib/calculations/strategyEngine.ts` | ~250 |
| Strategy definitions | `src/lib/data/strategies.ts` | ~150 |
| Risk profile data | `src/lib/data/riskProfiles.ts` | ~250 |
| Risk quiz | `src/lib/data/quiz.ts` | ~140 |
| Indian tax engine | `src/lib/calculations/taxEngine.ts` | ~280 |
| Monte Carlo | `src/lib/calculations/monteCarlo.ts` | ~140 |

> All TypeScript strict mode. Approximately 3,000 lines of pure financial logic, fully unit-testable, fully auditable.

---

<!-- _class: section -->

<div class="label">Part Nine</div>

# <strong>Results</strong>

<div class="rule"></div>

The empirical case for the four-bucket strategy.

---

# The headline result

A retiree starting at age 60 with a ₹1 Cr corpus, drawing ₹60,000 per month (inflation-adjusted at 6.5% per year), on the Moderate four-bucket strategy.

<div class="threecol">

<div class="kpi">
<div class="label">Year 1 Income</div>
<div class="value">₹60,000</div>
<div class="hint">per month, gross</div>
</div>

<div class="kpi">
<div class="label">Year 10 Income</div>
<div class="value">₹92,000</div>
<div class="hint">real-terms inflation-adjusted</div>
</div>

<div class="kpi">
<div class="label">Year 20 Corpus</div>
<div class="value">₹2.35 Cr</div>
<div class="hint">2.35× the starting corpus</div>
</div>

</div>

> The same retiree on a pure SCSS + FD ladder ends with **₹18 L of real-terms purchasing power**. Twelve times less. Same starting corpus. Same monthly draw.

---

# Crash resilience

The Moderate plan tested against a one-time **35% equity crash in year 5** — Lehman 2008 / COVID 2020 magnitude.

- Guardrails freeze the inflation increase that year and the next
- B4 harvest is suspended for three years until equity recovers
- B3 → B1 refill continues from the debt allocation
- The plan completes the 25-year horizon at ₹1.85 Cr (versus ₹2.35 Cr without the crash)

> The crash costs you **₹50 L of legacy corpus** but the plan does not break. Income continues uninterrupted.

---

# Monte Carlo outcomes

200 simulated paths with realistic bucket-specific volatility.

| Outcome | Result |
|---------|--------|
| **Success rate** | **92%** |
| Median final corpus | ₹1.95 Cr |
| 90th percentile | ₹4.10 Cr |
| 10th percentile | ₹85 L |
| Worst-case depletion | year 22 (4 of 200 paths) |

> A 92% success rate means in 184 of 200 simulated futures, the plan delivers full income for 25 years. The remaining 16 paths represent severe and sustained underperformance — recoverable with mid-course adjustments to draw or allocation.

---

<!-- _class: section -->

<div class="label">Part Ten</div>

# Using the <strong>tool</strong>

<div class="rule"></div>

Five minutes from corpus to verdict.

---

# Five-minute workflow

| Step | Tab | Action |
|------|-----|--------|
| 1 | **Plan** | Enter corpus, monthly target, demographics, expense breakdown |
| 2 | **Profile** | Take 10-question risk quiz, ~90 seconds |
| 3 | **Compare** | Review the 10-strategy scorecard, find your Best Fit |
| 4 | **Simulate** | Run Monte Carlo, verify ≥ 85% success rate |
| 5 | **Tax** | Set slab, review LTCG schedule and reshuffle advice |
| 6 | **Header** | Click **Export** for the branded PDF report |

The tool persists everything in browser localStorage. Returning later resumes exactly where you left off.

---

# Live URL

<div style="text-align: center; margin: 80px 0 40px 0;">
  <div style="font-size: 14px; color: #B8956A; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; font-weight: 600;">Production deployment</div>
  <div style="font-size: 44px; font-weight: 300; color: #1B2951; letter-spacing: -0.5px;">finance-liart-nine.vercel.app</div>
  <div style="width: 80px; height: 2px; background: #B8956A; margin: 32px auto 0;"></div>
</div>

- Free · No signup · No data leaves your device
- Mobile-friendly down to a 375px viewport
- Dark-mode aware · PDF export built-in
- Open-source — every simulator, tax rule, and fund recommendation is auditable

---

# Limitations

The tool is an **analytical aid** — not financial advice or tax preparation.

- **Returns are modelled, not predicted.** Real markets have fat tails the normal distribution does not capture.
- **Tax engine covers FY 2024-25 standard rules.** Personal deductions (full 80C, 80D, HRA, home-loan, foreign-asset reporting) are not modelled.
- **Joint retirement is partially modelled.** Survivor benefits and joint pensions need a CA review.
- **Fund recommendations are starting points.** Verify NAV, AUM, and expense ratios at the time of investment.
- **The stress test is a single adverse scenario.** Multi-asset crashes (e.g., a 2020-style debt + equity drawdown) are not modelled.
- **No transaction execution.** The tool plans; it does not buy, sell, or rebalance.

> Always validate any major action with a SEBI-registered investment advisor or a Chartered Accountant.

---

<!-- _class: lead -->

# Thank <strong>you.</strong>

## Questions, comments, and second opinions welcome.

<div class="meta">
  <div>
    <strong>Live tool</strong> &nbsp;&nbsp; finance-liart-nine.vercel.app<br>
    <strong>Documentation</strong> &nbsp;&nbsp; USER_MANUAL.md
  </div>
  <div>Version 2.0 · April 2026</div>
</div>
