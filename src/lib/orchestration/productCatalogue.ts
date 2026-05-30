// productCatalogue — Indian-context product categories, one per bucket.
//
// Each entry carries enough metadata for the selector (Phase 7) to
// score it against user attributes (tax bracket, age, bias, risk).
// Purely declarative.

import type { BucketId, TaxTreatment } from '../../types/orchestration'

export interface ProductCategory {
  id: string
  name: string
  bucket: BucketId
  vehicle: 'sa' | 'sweep-fd' | 'liquid-fund' | 'fd-ladder' | 'scss' | 'pmvvy' | 'ppf' | 'epf' | 'tax-free-bond' | 'baf' | 'aggressive-hybrid' | 'arbitrage' | 'index-fund' | 'large-cap-mf' | 'multi-cap-mf' | 'mid-cap-mf' | 'small-cap-mf' | 'gold-etf' | 'reit' | 'invit'
  taxTreatment: TaxTreatment
  /** Years the user can't easily withdraw. 0 = liquid. */
  lockYears: number
  /** Suitable tax brackets (percent). Empty = any. */
  taxBracketFit: Array<0 | 5 | 20 | 30>
  /** Eligible age band. */
  ageBand: { min: number; max: number }
  /** Typical post-inflation expected return %. */
  typicalRealReturn: number
  /** Concise positioning rationale shown in the trace. */
  rationale: string
}

// ─── B1 · Liquidity (0-2 y horizon) ────────────────────────────────────

const B1: ProductCategory[] = [
  {
    id: 'sweep-fd',
    name: 'Sweep / auto-FD',
    bucket: 'b1', vehicle: 'sweep-fd',
    taxTreatment: 'slab', lockYears: 0,
    taxBracketFit: [0, 5, 20],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 0.5,
    rationale: 'Same-day liquidity with FD rate; ideal for the emergency tier.',
  },
  {
    id: 'liquid-fund',
    name: 'Liquid mutual fund',
    bucket: 'b1', vehicle: 'liquid-fund',
    taxTreatment: 'slab', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 0.8,
    rationale: 'T+1 liquidity, marginally better post-tax than savings.',
  },
  {
    id: 'arbitrage',
    name: 'Arbitrage fund',
    bucket: 'b1', vehicle: 'arbitrage',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 1.2,
    rationale: 'Equity-taxed parking for the 30 % slab — beats debt-MF tax drag.',
  },
]

// ─── B2 · Floor (3-7 y horizon, capital-preserving) ────────────────────

const B2: ProductCategory[] = [
  {
    id: 'scss',
    name: 'Senior Citizen Savings Scheme',
    bucket: 'b2', vehicle: 'scss',
    taxTreatment: 'slab', lockYears: 5,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 60, max: 99 },
    typicalRealReturn: 2.5,
    rationale: '8.2 % govt-backed (FY25-26), ₹30 L cap — anchor of the senior floor.',
  },
  {
    id: 'fd-ladder',
    name: 'Bank FD ladder (5-rung)',
    bucket: 'b2', vehicle: 'fd-ladder',
    taxTreatment: 'slab', lockYears: 5,
    taxBracketFit: [0, 5, 20],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 1.0,
    rationale: 'Predictable maturities every 12 m; never touched once laddered.',
  },
  {
    id: 'tax-free-bonds',
    name: 'Tax-free PSU bonds',
    bucket: 'b2', vehicle: 'tax-free-bond',
    taxTreatment: 'exempt', lockYears: 10,
    taxBracketFit: [20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 2.2,
    rationale: 'Sec 10(15) tax-exempt coupon; beats post-tax FDs for the 30 % slab.',
  },
  {
    id: 'ppf',
    name: 'Public Provident Fund',
    bucket: 'b2', vehicle: 'ppf',
    taxTreatment: 'exempt', lockYears: 15,
    taxBracketFit: [20, 30],
    ageBand: { min: 18, max: 70 },
    typicalRealReturn: 2.0,
    rationale: 'EEE category; 7.1 % FY25-26; extendable in 5-y blocks.',
  },
  {
    id: 'pmvvy',
    name: 'PMVVY (where active)',
    bucket: 'b2', vehicle: 'pmvvy',
    taxTreatment: 'slab', lockYears: 10,
    taxBracketFit: [0, 5, 20],
    ageBand: { min: 60, max: 99 },
    typicalRealReturn: 1.8,
    rationale: 'Monthly-pension format; complements SCSS for retiree income.',
  },
]

// ─── B3 · Stability (7-12 y horizon, SWP source) ───────────────────────

const B3: ProductCategory[] = [
  {
    id: 'baf',
    name: 'Balanced Advantage Fund',
    bucket: 'b3', vehicle: 'baf',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 4.0,
    rationale: 'Dynamic equity-debt; equity tax + low drawdowns — ideal SWP source.',
  },
  {
    id: 'aggressive-hybrid',
    name: 'Aggressive Hybrid Fund',
    bucket: 'b3', vehicle: 'aggressive-hybrid',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 4.5,
    rationale: '65-80 % equity; better growth than BAF for moderate-risk holders.',
  },
  {
    id: 'large-cap-mf',
    name: 'Large-cap equity fund',
    bucket: 'b3', vehicle: 'large-cap-mf',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 5.0,
    rationale: 'Top-100 names; lower volatility than midcap for the SWP sleeve.',
  },
]

// ─── B4 · Growth (12 y +, compounding sleeve) ──────────────────────────

const B4: ProductCategory[] = [
  {
    id: 'index-fund',
    name: 'Index fund (Nifty 50 / Next 50)',
    bucket: 'b4', vehicle: 'index-fund',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 5.5,
    rationale: 'Lowest cost · matches market · the default core.',
  },
  {
    id: 'multi-cap',
    name: 'Multi-cap / Flexi-cap fund',
    bucket: 'b4', vehicle: 'multi-cap-mf',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 75 },
    typicalRealReturn: 6.0,
    rationale: 'Manager-driven cap-mix; diversifies the index core.',
  },
  {
    id: 'mid-cap',
    name: 'Mid-cap equity fund',
    bucket: 'b4', vehicle: 'mid-cap-mf',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 65 },
    typicalRealReturn: 7.0,
    rationale: 'Higher beta; only for satellite use under appetite ≥ 60.',
  },
  {
    id: 'gold-etf',
    name: 'Gold ETF',
    bucket: 'b4', vehicle: 'gold-etf',
    taxTreatment: 'ltcg-equity', lockYears: 0,
    taxBracketFit: [0, 5, 20, 30],
    ageBand: { min: 18, max: 99 },
    typicalRealReturn: 2.0,
    rationale: 'Inflation hedge; cap at 5–10 % per PDF §J.29.',
  },
  {
    id: 'reit',
    name: 'Listed REIT',
    bucket: 'b4', vehicle: 'reit',
    taxTreatment: 'slab', lockYears: 0,
    taxBracketFit: [0, 5, 20],
    ageBand: { min: 18, max: 75 },
    typicalRealReturn: 3.5,
    rationale: 'Yield-bearing real-estate exposure; complements REIT-free funds.',
  },
]

export const PRODUCT_CATALOGUE: readonly ProductCategory[] =
  [...B1, ...B2, ...B3, ...B4]

export function productsForBucket(b: BucketId): ProductCategory[] {
  return PRODUCT_CATALOGUE.filter((p) => p.bucket === b)
}

export function productById(id: string): ProductCategory | undefined {
  return PRODUCT_CATALOGUE.find((p) => p.id === id)
}
