// Derive a RiskCapacityInput for the v10 composites engine from the
// user's actual Plan-tab data (Wealth Snapshot + Loans + Budget). Pure
// function; safe when sub-sections are missing.

import type {
  AssetEntry,
  AssetInventory,
  ExpenseProfile,
  LoanEntry,
  LoanProfile,
  UserProfile,
} from '../../types'
import type { RiskCapacityInput } from '../../types/psychometric'

function entrySum(entries: AssetEntry[], pick: (e: AssetEntry) => number): number {
  return entries.reduce((s, e) => s + (e ? pick(e) : 0), 0)
}

function loanSum(entries: LoanEntry[], pick: (l: LoanEntry) => number): number {
  return entries.reduce((s, l) => s + (l && l.active ? pick(l) : 0), 0)
}

function allAssets(inv: AssetInventory | undefined): AssetEntry[] {
  if (!inv) return []
  return Object.values(inv) as AssetEntry[]
}

function liquidCashAssets(inv: AssetInventory | undefined): AssetEntry[] {
  if (!inv) return []
  // Treat the three pure cash slots + bank FDs (broken if needed) as the
  // emergency-accessible reserve. Excludes scheme money locked in
  // SCSS/PPF/NPS/EPF and any market-linked instruments.
  return [inv.savings, inv.sweepFdr, inv.cashOnHand, inv.bankFds].filter(Boolean) as AssetEntry[]
}

function allLoans(lp: LoanProfile | undefined): LoanEntry[] {
  if (!lp) return []
  const { strategy: _strategy, ...rest } = lp
  void _strategy
  return Object.values(rest) as LoanEntry[]
}

function expenseTotal(e: ExpenseProfile | undefined): number {
  if (!e) return 0
  return (e.essential ?? 0) + (e.lifestyle ?? 0) + (e.healthcare ?? 0) + (e.education ?? 0)
}

export function deriveRiskCapacity(p: UserProfile): RiskCapacityInput {
  const monthlyExpenses = expenseTotal(p.expenses)
  const monthlyEmi = loanSum(allLoans(p.loanProfile), (l) => l.emi)
  const monthlyAssetIncome = entrySum(allAssets(p.assetInventory), (e) => e.monthlyIncome) + (p.sipAmount ?? 0)
  const monthlyWithdrawal = p.monthlyWithdrawal ?? 0

  // "Effective income" — a stable denominator covering both retirees
  // (asset income + withdrawal) and pre-retirees (whose salary at minimum
  // covers expenses + EMI). Floor at 1 to avoid /0.
  const effectiveIncome = Math.max(
    monthlyAssetIncome + monthlyWithdrawal,
    monthlyExpenses + monthlyEmi,
    1,
  )

  const surplus = effectiveIncome - monthlyExpenses - monthlyEmi
  const savingsRate = Math.max(0, surplus / effectiveIncome)
  const debtToIncome = monthlyEmi / effectiveIncome

  const liquidCash = entrySum(liquidCashAssets(p.assetInventory), (e) => e.amount)
  const emergencyMonths = monthlyExpenses > 0 ? liquidCash / monthlyExpenses : 0

  return { savingsRate, debtToIncome, emergencyMonths }
}
