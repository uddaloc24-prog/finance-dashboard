// Wealth Snapshot — captures the user's full corpus across 34 asset classes
// using a clear, horizontal table layout. Each row shows the asset label,
// status (Liquid / Invested), market value, monthly income (when invested),
// and per-row actions (Upload CAS, Optimize) all on one line.
//
// The whole application is calculated on the LIQUID CORPUS:
//   profile.corpus     = Liquid Corpus  (drives buckets, simulators, tax)
//   profile.sipAmount  = sum of monthlyIncome from Invested Corpus

import { useRef, useState, useEffect, type ChangeEvent, type ReactNode } from 'react'
import type { AssetEntry, AssetInventory as AssetInventoryT, AssetStatus, UserProfile, BucketState, FrequencySchedule } from '../types'
import { DEFAULT_ASSET_INVENTORY } from '../constants'
import { allocateBuckets } from '../lib/calculations'
import { storage } from '../lib/storage'
import { parseUploadedFile } from '../lib/uploadParser'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (n > 0) return INR(n)
  return '₹0'
}

const STATUS_OPTIONS: Array<{ key: AssetStatus; label: string; activeBg: string; help: string }> = [
  { key: 'liquid',   label: 'Liquid',   activeBg: 'bg-emerald-600', help: 'Move into Liquid Corpus — drives every retirement calculation' },
  { key: 'invested', label: 'Invested', activeBg: 'bg-blue-600',    help: 'Hold as-is — its monthly income flows to Passive Income' },
]

interface SubAsset {
  key: keyof AssetInventoryT
  label: string
  hint?: string
  optimisable?: boolean
  uploadable?: boolean
  /**
   * Whether the asset realistically produces ongoing cash:
   *   monthly = an input field is shown (rent, SCSS, PMVVY, REIT, bond coupon, etc.)
   *   none    = the cell is a quiet "—" with a tooltip (PPF, EPF, gold, NPS, etc.)
   * Default is 'monthly' (back-compat).
   */
  incomeKind?: 'monthly' | 'none'
  /** When set, the Liquid/Invested toggle is replaced with a static badge. */
  fixedStatus?: AssetStatus
  /** Tooltip explaining why a field is fixed / hidden. */
  fixedReason?: string
}

interface AssetGroup {
  key: string
  num: string
  title: string
  desc: string
  tone: GroupTone
  icon: string
  subs: SubAsset[]
}

const GROUPS: AssetGroup[] = [
  {
    key: 'liquid', num: '01', title: 'Liquid & Cash', desc: 'Spendable within 24 hours',
    tone: 'sky', icon: '💧',
    subs: [
      // Cash-like balances are always liquid; bank interest auto-compounds, no income capture needed.
      { key: 'savings',    label: 'Savings A/c',      hint: 'All bank savings balances',     incomeKind: 'none', fixedStatus: 'liquid', fixedReason: 'Cash is always liquid; bank interest compounds in account' },
      { key: 'sweepFdr',   label: 'Sweep / Auto-FDR', hint: 'Auto-sweep linked FDs',         incomeKind: 'none', fixedStatus: 'liquid', fixedReason: 'Auto-swept back into the savings account' },
      { key: 'cashOnHand', label: 'Cash on hand',     hint: 'Physical cash + petty',         incomeKind: 'none', fixedStatus: 'liquid', fixedReason: 'Cash is always liquid; no income' },
    ],
  },
  {
    key: 'fixedIncome', num: '02', title: 'Fixed Income', desc: 'FDs, bonds — predictable yield',
    tone: 'navy', icon: '🏦',
    subs: [
      { key: 'bankFds',         label: 'Bank FDs',                                                             incomeKind: 'monthly' },
      // Recurring deposits accumulate; no payout till maturity.
      { key: 'bankRds',         label: 'Recurring Deposits',     hint: 'Monthly contribution accrual',         incomeKind: 'none', fixedReason: 'RDs accumulate — no payout until maturity' },
      { key: 'corporateBonds',  label: 'Corporate / NCD bonds',  hint: 'NBFC, corporate, NCDs · coupon',       incomeKind: 'monthly' },
      { key: 'govtBonds',       label: 'Govt Securities',        hint: 'G-Sec, T-bills · coupon',              incomeKind: 'monthly' },
      { key: 'rbiFrb',          label: 'RBI Floating-Rate Bonds', hint: 'Semi-annual coupon · enter monthly equivalent', incomeKind: 'monthly' },
    ],
  },
  {
    key: 'retirement', num: '03', title: 'Senior & Retirement Schemes', desc: 'PPF · EPF · NPS · SCSS · POMIS',
    tone: 'emerald', icon: '🏛️',
    subs: [
      // Payout schemes
      { key: 'scss',     label: 'SCSS',              hint: 'Senior Citizen Savings Scheme · quarterly → monthly equivalent', incomeKind: 'monthly' },
      { key: 'pomis',    label: 'POMIS',             hint: 'Post Office Monthly Income · literal monthly payout',             incomeKind: 'monthly' },
      { key: 'pmvvy',    label: 'PMVVY',             hint: 'LIC pension · monthly annuity',                                   incomeKind: 'monthly' },
      // Compounding / locked schemes
      { key: 'ppf',      label: 'PPF',               hint: 'Public Provident Fund · compounds annually · 15-yr lock',         incomeKind: 'none', fixedReason: 'PPF interest is reinvested annually until maturity' },
      { key: 'epfVpf',   label: 'EPF + VPF',         hint: 'Employee + Voluntary PF · compounds till withdrawal',             incomeKind: 'none', fixedReason: 'EPF compounds until withdrawal at retirement' },
      { key: 'npsTier1', label: 'NPS Tier 1',        hint: 'Locked till 60 · no ongoing payout',                              incomeKind: 'none', fixedReason: 'No payout till 60 (then 40% annuity + 60% lump sum)' },
      { key: 'npsTier2', label: 'NPS Tier 2',        hint: 'Fully liquid · no payout',                                        incomeKind: 'none', fixedStatus: 'liquid', fixedReason: 'NPS Tier 2 has no income stream; treated as liquid' },
      { key: 'sukanya',  label: 'Sukanya Samriddhi', hint: 'Daughter-specific · locked till 18 / 21 / marriage',              incomeKind: 'none', fixedReason: 'Locked till the girl child reaches 18/21; no interim payout' },
    ],
  },
  {
    key: 'mutualFunds', num: '04', title: 'Mutual Funds', desc: 'All MFs (Equity · Index · Hybrid · Debt · ELSS · Gold) — clubbed',
    tone: 'amber', icon: '📊',
    subs: [
      // MFs may have SWP set up; income optional.
      { key: 'mutualFunds', label: 'Total MF Portfolio', hint: 'Sum of every MF · monthly income only if an SWP is active', optimisable: true, uploadable: true, incomeKind: 'monthly' },
    ],
  },
  {
    key: 'directEquity', num: '05', title: 'Direct Equity', desc: 'Indian + international stocks held directly',
    tone: 'orange', icon: '📈',
    subs: [
      // Dividends are irregular and small — not modelled as monthly income here.
      { key: 'stocksIndia', label: 'Indian stocks',    hint: 'Direct equity — NSE/BSE',      optimisable: true, incomeKind: 'none', fixedReason: 'Indian-stock dividends are sporadic; treated as capital appreciation only' },
      { key: 'stocksIntl',  label: 'US / Intl stocks', hint: 'Direct foreign equity / RSUs', optimisable: true, incomeKind: 'none', fixedReason: 'Foreign dividends are irregular; treated as capital appreciation' },
    ],
  },
  {
    key: 'realEstate', num: '06', title: 'Real Estate', desc: 'Residential, commercial, land — rental income flows to passive',
    tone: 'rose', icon: '🏠',
    subs: [
      // Self-occupied = no income, always "invested" (you live in it; can't liquidate without moving).
      { key: 'selfOccupiedHome',   label: 'Self-occupied home', hint: 'Your primary residence', incomeKind: 'none', fixedStatus: 'invested', fixedReason: 'You live here — no rental income, not realistically liquid' },
      { key: 'secondHome',         label: 'Second home',        hint: 'Additional residential · rental income',  incomeKind: 'monthly' },
      { key: 'commercialProperty', label: 'Commercial',         hint: 'Shop, office, warehouse · rental income', incomeKind: 'monthly' },
      // Raw land typically generates nothing till sold.
      { key: 'landPlot',           label: 'Land / Plot',        hint: 'Undeveloped land · capital growth only',  incomeKind: 'none', fixedReason: 'Undeveloped land generates no ongoing income' },
      { key: 'reits',              label: 'REITs',              hint: 'Listed real-estate trusts · distributions', incomeKind: 'monthly' },
      { key: 'invits',             label: 'InvITs',             hint: 'Infra investment trusts · distributions',   incomeKind: 'monthly' },
    ],
  },
  {
    key: 'gold', num: '07', title: 'Gold & Precious Metals', desc: 'Cultural & inflation-hedge holdings',
    tone: 'gold', icon: '🟡',
    subs: [
      { key: 'physicalGold', label: 'Physical gold', hint: 'Jewelry, coins, bars (market value)',                  incomeKind: 'none', fixedReason: 'Physical gold has no cash yield' },
      // SGB has 2.5% semi-annual interest — small but real. Allow input.
      { key: 'sgb',          label: 'SGB',           hint: 'Sovereign Gold Bonds · 2.5% semi-annual · enter monthly equivalent', incomeKind: 'monthly' },
      { key: 'silver',       label: 'Silver',        hint: 'Physical or ETFs',                                     incomeKind: 'none', fixedReason: 'Silver has no cash yield' },
    ],
  },
  {
    key: 'alternative', num: '08', title: 'Alternative & Other', desc: 'Insurance, crypto, business equity, foreign',
    tone: 'purple', icon: '🌐',
    subs: [
      { key: 'ulipsEndowment',  label: 'ULIPs / Endowment',  hint: 'Surrender / cash value', incomeKind: 'none', fixedReason: 'Endowment / ULIP pays out only at maturity or surrender' },
      { key: 'crypto',          label: 'Crypto',             hint: 'BTC, ETH, etc. · capital only', incomeKind: 'none', fixedReason: 'Crypto yields (staking) are excluded — too volatile to model as steady income' },
      { key: 'businessEquity',  label: 'Business equity',    hint: 'Stake in own / private business · dividend / draw', incomeKind: 'monthly' },
      { key: 'foreignAssets',   label: 'Foreign assets',     hint: 'RSUs, overseas accounts, property · dividend / rent', incomeKind: 'monthly' },
      { key: 'collectibles',    label: 'Collectibles',       hint: 'Art, antiques, watches', incomeKind: 'none', fixedReason: 'Collectibles appreciate but produce no income' },
    ],
  },
]

// ── Migration helper ────────────────────────────────────────────────

function toEntry(v: unknown, fallback: AssetEntry): AssetEntry {
  if (typeof v === 'number') return { ...fallback, amount: v }
  if (v && typeof v === 'object' && 'amount' in v) {
    const obj = v as { amount: unknown; status?: unknown; monthlyIncome?: unknown; optimize?: unknown }
    const amount = typeof obj.amount === 'number' ? obj.amount : 0
    let status: AssetStatus = fallback.status
    if (obj.status === 'liquid' || obj.status === 'liquidate') status = 'liquid'
    else if (obj.status === 'invested' || obj.status === 'keep' || obj.status === 'optimize') status = 'invested'
    const monthlyIncome = typeof obj.monthlyIncome === 'number' ? obj.monthlyIncome : 0
    const optimize = obj.status === 'optimize' ? true : (obj.optimize === true)
    return { amount, status, monthlyIncome, optimize }
  }
  return fallback
}

function ensureInventory(profile: UserProfile): AssetInventoryT {
  const raw = (profile.assetInventory ?? {}) as Record<string, unknown>
  const result: AssetInventoryT = { ...DEFAULT_ASSET_INVENTORY }
  for (const key of Object.keys(DEFAULT_ASSET_INVENTORY) as Array<keyof AssetInventoryT>) {
    result[key] = toEntry(raw[key], DEFAULT_ASSET_INVENTORY[key])
  }
  return result
}

// ── Aggregation ──────────────────────────────────────────────────────

interface Totals {
  total: number
  liquid: number
  invested: number
  passiveMonthly: number
  optimizeFlagged: number
}

function totalsOf(inv: AssetInventoryT): Totals {
  let total = 0, liquid = 0, invested = 0, passiveMonthly = 0, optimizeFlagged = 0
  for (const key of Object.keys(inv) as Array<keyof AssetInventoryT>) {
    const e = inv[key]
    const a = e.amount || 0
    total += a
    if (e.status === 'liquid') liquid += a
    else {
      invested += a
      passiveMonthly += e.monthlyIncome || 0
    }
    if (e.optimize && a > 0) optimizeFlagged += a
  }
  return { total, liquid, invested, passiveMonthly, optimizeFlagged }
}

function groupTotal(inv: AssetInventoryT, group: AssetGroup): number {
  return group.subs.reduce((s, sub) => s + (inv[sub.key].amount || 0), 0)
}

// ── Visual primitives ────────────────────────────────────────────────

// Shared CSS grid template for asset rows. 5 columns on lg+.
//   1: Label (truncating)
//   2: Status segmented (180px)
//   3: Value input (160px)
//   4: Income input or "—" (160px)
//   5: Actions (auto)
// Five-column layout at lg; collapses to a 2-row layout at md (label on row 1,
// controls in a balanced sub-grid on row 2); stacks vertically on mobile.
const ROW_GRID =
  'grid items-center gap-3 sm:gap-3.5 ' +
  'grid-cols-[1fr] ' +
  'lg:grid-cols-[minmax(0,2.1fr)_170px_minmax(150px,1fr)_minmax(150px,1fr)_auto]'

function ColumnHeaders() {
  return (
    <div className={`${ROW_GRID} px-5 py-2.5 bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-200 hidden lg:grid`}>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600">Asset Class</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-center">Status</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right tabular-nums">Value (₹)</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right tabular-nums">Monthly Income (₹)</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">Actions</span>
    </div>
  )
}

interface MoneyInputProps {
  value: number
  placeholder?: string
  onCommit: (v: number) => void
  textColor: string
  suffix?: ReactNode
  ariaLabel: string
  disabled?: boolean
}

function MoneyInput({ value, placeholder = '0', onCommit, textColor, suffix, ariaLabel, disabled }: MoneyInputProps) {
  const [text, setText] = useState(String(value || ''))
  useEffect(() => { setText(String(value || '')) }, [value])

  function commit() {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10)
    const v = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    if (v !== value) onCommit(v)
    setText(String(v || ''))
  }

  if (disabled) {
    return (
      <div
        className="flex items-center justify-end bg-slate-50/70 border border-dashed border-slate-200 rounded-md px-2.5 py-1.5 text-slate-400 text-[11px] italic"
        title="Only available when the asset is set to Invested"
      >
        not applicable
      </div>
    )
  }

  return (
    <div className="group flex items-baseline gap-1.5 bg-white border-2 border-slate-200 rounded-md px-2.5 py-1.5 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
      <span className="text-[12px] font-bold text-slate-400 shrink-0">₹</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 bg-transparent text-[13px] font-bold ${textColor} outline-none tabular-nums text-right placeholder:font-normal placeholder:text-slate-300`}
      />
      {suffix && <span className="shrink-0 leading-none">{suffix}</span>}
    </div>
  )
}

// ── Asset row ────────────────────────────────────────────────────────

interface AssetRowProps {
  entry: AssetEntry
  sub: SubAsset
  textColor: string
  onChange: (next: AssetEntry) => void
  onUpload?: () => void
  uploadBusy?: boolean
}

function AssetRow({ entry, sub, textColor, onChange, onUpload, uploadBusy }: AssetRowProps) {
  // Normalise to declared shape — fixedStatus assets shouldn't carry stale data
  const effectiveStatus = sub.fixedStatus ?? entry.status
  const incomeKind = sub.incomeKind ?? 'monthly'

  function setStatus(s: AssetStatus) {
    if (sub.fixedStatus) return
    if (s !== entry.status) onChange({ ...entry, status: s })
  }
  function toggleOptimize() {
    onChange({ ...entry, optimize: !entry.optimize })
  }

  const hasValue = entry.amount > 0
  const accent = hasValue ? (effectiveStatus === 'liquid' ? 'before:bg-emerald-500' : 'before:bg-blue-500') : 'before:bg-transparent'

  return (
    <div
      className={[
        ROW_GRID,
        'relative pl-5 pr-4 lg:pr-5 py-2.5 lg:py-2 transition-colors border-b border-slate-100 last:border-b-0 even:bg-slate-50/40 hover:bg-slate-50',
        // Left-edge tone accent — only when the row has a value
        `before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-r ${accent}`,
      ].join(' ')}
    >
      {/* Label + hint */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-slate-900 leading-snug">{sub.label}</span>
          {entry.optimize && entry.amount > 0 && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[1.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              ★ Flagged
            </span>
          )}
        </div>
        {sub.hint && (
          <div className="text-[10.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2" title={sub.hint}>
            {sub.hint}
          </div>
        )}
      </div>

      {/* Mobile / md sub-grid wrapper — only renders below lg.
          Status, Value, Monthly Income, Actions sit in a 2-col grid for
          tablet / phone so they wrap consistently. At lg+, the parent
          grid takes over and these become four separate cells. */}
      <div className="grid grid-cols-2 gap-2 lg:contents">
        {/* Status — segmented (or fixed badge for assets that don't toggle) */}
        {sub.fixedStatus ? (
          <div
            className="col-span-2 lg:col-span-1 flex items-center justify-center"
            title={sub.fixedReason}
          >
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded border ${
                sub.fixedStatus === 'liquid'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              <span aria-hidden="true">●</span>
              {sub.fixedStatus === 'liquid' ? 'Liquid (fixed)' : 'Invested (fixed)'}
            </span>
          </div>
        ) : (
          <div
            className="inline-flex bg-slate-100 rounded-md p-0.5 gap-0.5 w-full col-span-2 lg:col-span-1 border border-slate-200"
            role="group"
            aria-label="Move to Liquid Corpus or Invested Corpus"
          >
            {STATUS_OPTIONS.map((opt) => {
              const active = entry.status === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatus(opt.key)}
                  aria-pressed={active}
                  title={opt.help}
                  className={[
                    'flex-1 px-2 py-1 text-[11px] font-bold rounded transition-colors tracking-tight',
                    active ? `${opt.activeBg} text-white shadow-sm`
                           : 'text-slate-600 hover:text-slate-900 hover:bg-white',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Value */}
        <div className="lg:contents">
          <span className="lg:hidden text-[9px] font-bold tracking-[2px] uppercase text-slate-500 -mb-1">Value (₹)</span>
          <MoneyInput
            value={entry.amount}
            placeholder="0"
            textColor={textColor}
            ariaLabel={`${sub.label} value`}
            onCommit={(v) => onChange({ ...entry, amount: v })}
          />
        </div>

        {/* Monthly income — input only when the asset can produce regular cash;
            otherwise a quiet "—" with a tooltip explaining why. */}
        <div className="lg:contents">
          <span className="lg:hidden text-[9px] font-bold tracking-[2px] uppercase text-slate-500 -mb-1">Monthly (₹)</span>
          {incomeKind === 'none' ? (
            <div
              className="flex items-center justify-end bg-slate-50/40 border border-dashed border-slate-200 rounded-md px-2.5 py-1.5 text-slate-400 text-[11px] italic"
              title={sub.fixedReason ?? 'This asset does not produce regular monthly income'}
            >
              no payout
            </div>
          ) : (
            <MoneyInput
              value={entry.monthlyIncome}
              placeholder="0"
              textColor="text-blue-700"
              ariaLabel={`${sub.label} monthly income`}
              suffix={<span className="text-[10px] text-slate-400 font-semibold">/mo</span>}
              disabled={effectiveStatus !== 'invested'}
              onCommit={(v) => onChange({ ...entry, monthlyIncome: v })}
            />
          )}
        </div>

        {/* Actions — Upload (MFs) + Optimize (MFs / Stocks) */}
        <div className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:justify-end col-span-2 lg:col-span-1">
          {sub.uploadable && onUpload && (
            <button
              type="button"
              onClick={onUpload}
              disabled={uploadBusy}
              className="px-2.5 py-1.5 text-[10px] font-bold rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
              title="Upload CAS / portfolio statement to auto-fill total"
            >
              {uploadBusy ? '⌛ Reading…' : '↥ Upload CAS'}
            </button>
          )}
          {sub.optimisable && (
            <button
              type="button"
              onClick={toggleOptimize}
              className={[
                'px-2.5 py-1.5 text-[10px] font-bold rounded-md border transition-colors whitespace-nowrap',
                entry.optimize
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400',
              ].join(' ')}
              title="Flag this portfolio for optimisation review"
            >
              {entry.optimize ? '★ Flagged' : '★ Optimize'}
            </button>
          )}
          {!sub.uploadable && !sub.optimisable && (
            <span className="text-[10px] text-slate-300 italic hidden lg:block">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Editor ───────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
  chrome?: 'default' | 'bare'
}

function extractPortfolioTotal(text: string): number | null {
  if (!text) return null
  const tail = text.slice(Math.floor(text.length * 0.5))
  const patterns = [
    /grand\s*total[^\d₹]{0,40}₹?\s*([\d,]+(?:\.\d+)?)/i,
    /(?:portfolio|investment|current)\s*value[^\d₹]{0,40}₹?\s*([\d,]+(?:\.\d+)?)/i,
    /total\s*(?:value|investment|portfolio)[^\d₹]{0,40}₹?\s*([\d,]+(?:\.\d+)?)/i,
    /^\s*total\s*[:|]\s*₹?\s*([\d,]+(?:\.\d+)?)/im,
  ]
  for (const re of patterns) {
    const m = tail.match(re) || text.match(re)
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(num) && num > 1000) return Math.round(num)
    }
  }
  return null
}

export function AssetInventory({ profile, buckets: _buckets, onProfileUpdate, onBucketsUpdate, chrome = 'default' }: Props) {
  void _buckets
  const inventory = ensureInventory(profile)
  const totals = totalsOf(inventory)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  function update(key: keyof AssetInventoryT, next: AssetEntry) {
    const newInv: AssetInventoryT = { ...inventory, [key]: next }
    const newTotals = totalsOf(newInv)
    const alloc = profile.bucketAllocation ?? { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 }
    const newBuckets = allocateBuckets(newTotals.liquid, alloc)
    const monthlyPassive = Math.round(newTotals.passiveMonthly)
    const newSchedule: FrequencySchedule = {
      monthly: monthlyPassive, quarterly: 0, halfYearly: 0, yearly: 0,
    }
    const updatedProfile: UserProfile = {
      ...profile,
      assetInventory: newInv,
      corpus: newTotals.liquid,
      sipAmount: monthlyPassive,
      sipSchedule: newSchedule,
      sipFrequency: 'monthly',
    }
    storage.setProfile(updatedProfile)
    storage.setBuckets(newBuckets)
    onProfileUpdate(updatedProfile)
    onBucketsUpdate(newBuckets)
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadBusy(true)
    setUploadResult(null)
    try {
      const parsed = await parseUploadedFile(file)
      const fullText = parsed.rawTextFull ?? parsed.rawTextSample ?? ''
      const total = extractPortfolioTotal(fullText)
      const jsonInferred =
        (parsed.profile && 'mutualFunds' in (parsed.profile as Record<string, unknown>))
          ? (parsed.profile as Record<string, number>).mutualFunds
          : null
      const finalTotal = total ?? jsonInferred ?? null

      if (finalTotal != null && finalTotal > 0) {
        update('mutualFunds', { ...inventory.mutualFunds, amount: Math.round(finalTotal) })
        setUploadResult({ kind: 'success', message: `Detected ₹${Math.round(finalTotal).toLocaleString('en-IN')} from ${parsed.fileName}.` })
      } else {
        setUploadResult({ kind: 'error', message: `Couldn't auto-detect a portfolio total in ${parsed.fileName}. Enter the value manually.` })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadResult({ kind: 'error', message: msg })
    } finally {
      setUploadBusy(false)
    }
  }

  function pickFile() {
    fileInputRef.current?.click()
  }

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-800">Wealth Snapshot</h2>
          <span className="text-sm font-bold text-slate-900">{CR(totals.total)}</span>
        </div>
      )}

      <p className="text-xs text-slate-600 leading-relaxed mb-4 max-w-4xl">
        Capture every rupee across <strong>{GROUPS.reduce((n, g) => n + g.subs.length, 0)} asset classes</strong> in
        {' '}<strong>{GROUPS.length} groups</strong>. For each row pick{' '}
        <strong className="text-emerald-700">Liquid</strong> (move into Liquid Corpus — drives every retirement calculation)
        or <strong className="text-blue-700">Invested</strong> (held; its monthly income flows to{' '}
        <strong className="text-blue-700">Passive Income</strong>). Mutual funds are clubbed —
        upload your CAS / portfolio statement to auto-fill.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.md,.txt"
        onChange={handleUpload}
        className="sr-only"
        aria-hidden="true"
      />

      {uploadResult && (
        <div
          className={[
            'mb-4 rounded-lg border-2 px-4 py-2.5 text-xs',
            uploadResult.kind === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900',
          ].join(' ')}
        >
          <strong>{uploadResult.kind === 'success' ? '✓ Imported' : '⚠ Heads up'}:</strong>{' '}
          {uploadResult.message}
        </div>
      )}

      {/* Group cards */}
      <div className="space-y-4">
        {GROUPS.map((g) => {
          const t = TONES[g.tone]
          const gt = groupTotal(inventory, g)
          const pct = totals.total > 0 ? (gt / totals.total) * 100 : 0
          return (
            <section
              key={g.key}
              className={`relative rounded-xl bg-white border-2 ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${t.bar}`} aria-hidden="true" />
              {/* Group header */}
              <header className={`flex items-center justify-between gap-3 px-5 py-4 ${t.bg} border-b-2 border-slate-100`}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`shrink-0 w-11 h-11 rounded-lg ${t.numBg} ${t.text} font-serif text-xl font-extralight tabular-nums flex items-center justify-center border-2 ${t.border} shadow-sm`}
                    aria-hidden="true"
                  >
                    {g.num}
                  </span>
                  <div className="min-w-0">
                    <div className={`flex items-baseline gap-2 ${t.text}`}>
                      <span className="text-[10px] font-bold tracking-[2.5px] uppercase">Group {parseInt(g.num, 10)}</span>
                      <span className="text-lg" aria-hidden="true">{g.icon}</span>
                    </div>
                    <h3 className="font-serif text-base font-extralight tracking-tight text-slate-900 leading-tight">
                      <span className="font-bold">{g.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{g.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-slate-500 uppercase tracking-[2px] font-bold">Subtotal</div>
                  <div className={`text-lg font-extrabold tabular-nums ${t.text} leading-tight`}>{CR(gt)}</div>
                </div>
              </header>

              <ColumnHeaders />

              {g.subs.map((sub) => (
                <AssetRow
                  key={sub.key}
                  entry={inventory[sub.key]}
                  sub={sub}
                  textColor={t.text}
                  onChange={(next) => update(sub.key, next)}
                  onUpload={sub.uploadable ? pickFile : undefined}
                  uploadBusy={sub.uploadable ? uploadBusy : false}
                />
              ))}

              {totals.total > 0 && (
                <div className="px-4 py-2.5 border-t-2 border-slate-100 bg-slate-50/60 flex items-center gap-3">
                  <div className="flex-1 bg-white border border-slate-200 rounded-full h-2 overflow-hidden">
                    <div className={`${t.bar} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-700 tabular-nums shrink-0 font-semibold">
                    {pct.toFixed(1)}% of total wealth
                  </span>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Bottom totals */}
      <section className="mt-5 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[3px] uppercase text-slate-700">Total wealth</div>
            <div className="text-[12px] text-slate-600 mt-1 leading-snug max-w-2xl">
              <strong className="text-emerald-700">Liquid Corpus</strong> drives every retirement calculation.{' '}
              <strong className="text-blue-700">Invested Corpus</strong> stays held — its income flows to Passive Income.
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{CR(totals.total)}</div>
            <div className="text-[11px] text-slate-500 tabular-nums mt-1">
              {GROUPS.length} groups · {GROUPS.reduce((n, g) => n + g.subs.length, 0)} asset classes
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SplitCard
            tone="emerald"
            label="Liquid Corpus"
            sub={totals.total > 0 ? `${((totals.liquid / totals.total) * 100).toFixed(1)}% of total · drives calcs` : 'drives calcs'}
            value={totals.liquid}
          />
          <SplitCard
            tone="navy"
            label="Invested Corpus"
            sub={totals.total > 0 ? `${((totals.invested / totals.total) * 100).toFixed(1)}% of total · held` : 'held'}
            value={totals.invested}
            badge={totals.optimizeFlagged > 0 ? `${CR(totals.optimizeFlagged)} flagged for optimisation` : undefined}
          />
          <SplitCard
            tone="amber"
            label="Passive Income"
            sub="from invested assets · synced to SIP"
            value={totals.passiveMonthly}
            valueSuffix="/mo"
          />
        </div>

        {totals.total > 0 && (
          <>
            <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-slate-100" role="img" aria-label="Liquid vs Invested split">
              {totals.liquid > 0 && (
                <div className="bg-emerald-500" style={{ width: `${(totals.liquid / totals.total) * 100}%` }} />
              )}
              {totals.invested > 0 && (
                <div className="bg-blue-600" style={{ width: `${(totals.invested / totals.total) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-700 tabular-nums">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                Liquid {CR(totals.liquid)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" aria-hidden="true" />
                Invested {CR(totals.invested)}
              </span>
            </div>
          </>
        )}
      </section>
    </>
  )

  if (chrome === 'bare') return <>{body}</>

  return (
    <Card className="p-0">
      <div className="p-4 sm:p-5">{body}</div>
    </Card>
  )
}

// ── Split summary card ───────────────────────────────────────────────

function SplitCard({
  tone, label, sub, value, badge, valueSuffix,
}: {
  tone: 'emerald' | 'navy' | 'amber'
  label: string
  sub: string
  value: number
  badge?: string
  valueSuffix?: string
}) {
  const t =
    tone === 'emerald' ? { border: 'border-emerald-300', ring: 'ring-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/60' } :
    tone === 'navy'    ? { border: 'border-blue-300',    ring: 'ring-blue-100',    bar: 'bg-blue-600',    text: 'text-blue-700',    bg: 'bg-blue-50/60' } :
                         { border: 'border-amber-300',   ring: 'ring-amber-100',   bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50/60' }
  return (
    <div className={`relative rounded-lg border-2 ${t.border} ring-1 ring-inset ${t.ring} ${t.bg} px-3.5 py-3 overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${t.bar}`} aria-hidden="true" />
      <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text}`}>{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums ${t.text} leading-tight mt-0.5`}>
        {CR(value)}{valueSuffix && <span className="text-[11px] font-semibold ml-0.5">{valueSuffix}</span>}
      </div>
      <div className="text-[10px] text-slate-600 leading-snug mt-1">{sub}</div>
      {badge && (
        <div className="mt-2 text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 inline-block">
          ★ {badge}
        </div>
      )}
    </div>
  )
}

// ── Tone palette ─────────────────────────────────────────────────────

type GroupTone = 'sky' | 'navy' | 'emerald' | 'amber' | 'orange' | 'rose' | 'gold' | 'purple'

const TONES: Record<GroupTone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string
}> = {
  sky:     { border: 'border-sky-300',     ring: 'ring-sky-100',     bar: 'bg-sky-500',     text: 'text-sky-700',     bg: 'bg-sky-50/60',     numBg: 'bg-sky-50' },
  navy:    { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-50/60',    numBg: 'bg-blue-50' },
  emerald: { border: 'border-emerald-400', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50/60', numBg: 'bg-emerald-50' },
  amber:   { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50/60',   numBg: 'bg-amber-50' },
  orange:  { border: 'border-orange-400',  ring: 'ring-orange-100',  bar: 'bg-orange-600',  text: 'text-orange-700',  bg: 'bg-orange-50/60',  numBg: 'bg-orange-50' },
  rose:    { border: 'border-rose-400',    ring: 'ring-rose-100',    bar: 'bg-rose-600',    text: 'text-rose-700',    bg: 'bg-rose-50/60',    numBg: 'bg-rose-50' },
  gold:    { border: 'border-yellow-400',  ring: 'ring-yellow-100',  bar: 'bg-yellow-500',  text: 'text-yellow-700',  bg: 'bg-yellow-50/60',  numBg: 'bg-yellow-50' },
  purple:  { border: 'border-purple-400',  ring: 'ring-purple-100',  bar: 'bg-purple-600',  text: 'text-purple-700',  bg: 'bg-purple-50/60',  numBg: 'bg-purple-50' },
}
