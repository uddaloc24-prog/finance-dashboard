// analytics — pure aggregation functions over a transactions array.
// .md §8 (adapted): the "endpoints" become function calls; results are
// JSON-serialisable so the narrative + chart components consume them
// without further normalisation.

import type {
  Account, Category, CategoryType, PaymentMode, Transaction,
} from '../../types/expense'

// ─── Public types ────────────────────────────────────────────────────

export interface MonthlySummary {
  yearMonth: string                                       // YYYY-MM
  totals: {
    income:      number
    expense:     number
    savings:     number
    /** savings / income — 0 if income is 0. */
    savingsRate: number
    count:       number
  }
  byCategoryType:   Record<CategoryType, number>
  byParentCategory: Array<{ id: string; name: string; type: CategoryType; total: number }>
  byChildCategory:  Array<{ id: string; name: string; parentId: string; parentName: string; total: number }>
  byPaymentMode:    Record<PaymentMode, number>
  byAccount:        Array<{ id: string; name: string; total: number }>
  topCategories:    Array<{ id: string; name: string; total: number }>
}

export interface MonthTrendPoint {
  yearMonth: string
  income:    number
  expense:   number
  savings:   number
  byType:    Record<CategoryType, number>
}

export type InternalQueryMetric = 'sum' | 'avg' | 'count' | 'list'
export type InternalQueryPeriod = 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'last_year'

export interface InternalQuery {
  metric:   InternalQueryMetric
  category: string | null                                 // categoryCode or null = all
  period:   InternalQueryPeriod
}

export interface QueryResult {
  metric:      InternalQueryMetric
  value:       number | Transaction[]
  unit:        'INR' | 'count'
  period:      InternalQueryPeriod
  matchedTxns: number
  description: string
}

// ─── Helpers ─────────────────────────────────────────────────────────

const ZERO_BY_TYPE: Record<CategoryType, number> = {
  NEED: 0, WANT: 0, SAVING: 0, INCOME: 0,
}
const ZERO_BY_MODE: Record<PaymentMode, number> = {
  UPI: 0, CARD: 0, CASH: 0, NET_BANKING: 0, AUTO_DEBIT: 0, OTHER: 0,
}

function typeOf(catId: string | null, cats: Category[]): CategoryType | null {
  if (!catId) return null
  return cats.find((c) => c.id === catId)?.type ?? null
}

function parentOf(cat: Category, cats: Category[]): Category | null {
  if (cat.parentId === null) return null
  return cats.find((c) => c.id === cat.parentId) ?? null
}

function inMonth(t: Transaction, yyyyMm: string): boolean {
  return t.date.startsWith(yyyyMm)
}

function yyyyMm(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Monthly summary ────────────────────────────────────────────────

export function monthlySummary(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  yearMonth: string,
): MonthlySummary {
  const month = transactions.filter((t) => inMonth(t, yearMonth))

  let income = 0, expense = 0, savings = 0
  const byCategoryType: Record<CategoryType, number> = { ...ZERO_BY_TYPE }
  const byPaymentMode:  Record<PaymentMode, number>  = { ...ZERO_BY_MODE }
  const byParentMap = new Map<string, { id: string; name: string; type: CategoryType; total: number }>()
  const byChildMap  = new Map<string, { id: string; name: string; parentId: string; parentName: string; total: number }>()
  const byAccountMap = new Map<string, { id: string; name: string; total: number }>()

  for (const t of month) {
    // Direction → bucket
    const type = typeOf(t.categoryId, categories)
    if (type === 'INCOME' && t.direction === 'CREDIT') income += t.amount
    else if (type === 'SAVING' && t.direction === 'DEBIT') savings += t.amount
    else if (t.direction === 'DEBIT')                  expense += t.amount

    // By type
    if (type) byCategoryType[type] += t.amount

    // By payment mode
    byPaymentMode[t.paymentMode] += t.amount

    // By account
    const acc = accounts.find((a) => a.id === t.accountId)
    if (acc) {
      const cur = byAccountMap.get(acc.id) ?? { id: acc.id, name: acc.name, total: 0 }
      cur.total += t.amount
      byAccountMap.set(acc.id, cur)
    }

    // By category (parent + child)
    if (t.categoryId) {
      const cat = categories.find((c) => c.id === t.categoryId)
      if (cat) {
        const parent = parentOf(cat, categories) ?? cat
        const parentEntry = byParentMap.get(parent.id) ?? { id: parent.id, name: parent.name, type: parent.type, total: 0 }
        parentEntry.total += t.amount
        byParentMap.set(parent.id, parentEntry)

        if (cat.parentId !== null) {
          const childEntry = byChildMap.get(cat.id) ?? { id: cat.id, name: cat.name, parentId: parent.id, parentName: parent.name, total: 0 }
          childEntry.total += t.amount
          byChildMap.set(cat.id, childEntry)
        }
      }
    }
  }

  const byParentCategory = [...byParentMap.values()].sort((a, b) => b.total - a.total)
  const byChildCategory  = [...byChildMap.values()].sort((a, b) => b.total - a.total)
  const byAccount        = [...byAccountMap.values()].sort((a, b) => b.total - a.total)

  return {
    yearMonth,
    totals: {
      income:  round(income),
      expense: round(expense),
      savings: round(savings),
      savingsRate: income > 0 ? round(savings / income, 4) : 0,
      count:   month.length,
    },
    byCategoryType: Object.fromEntries(
      Object.entries(byCategoryType).map(([k, v]) => [k, round(v)]),
    ) as Record<CategoryType, number>,
    byParentCategory: byParentCategory.map((p) => ({ ...p, total: round(p.total) })),
    byChildCategory:  byChildCategory.map((c) => ({ ...c, total: round(c.total) })),
    byPaymentMode: Object.fromEntries(
      Object.entries(byPaymentMode).map(([k, v]) => [k, round(v)]),
    ) as Record<PaymentMode, number>,
    byAccount: byAccount.map((a) => ({ ...a, total: round(a.total) })),
    topCategories: byChildCategory.slice(0, 5).map(({ id, name, total }) => ({ id, name, total: round(total) })),
  }
}

// ─── Trends ─────────────────────────────────────────────────────────

export function trends(
  transactions: Transaction[],
  categories: Category[],
  months: number,
  now: Date = new Date(),
): MonthTrendPoint[] {
  const out: MonthTrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = yyyyMm(d)
    const inThisMonth = transactions.filter((t) => inMonth(t, key))

    let income = 0, expense = 0, savings = 0
    const byType: Record<CategoryType, number> = { ...ZERO_BY_TYPE }

    for (const t of inThisMonth) {
      const type = typeOf(t.categoryId, categories)
      if (type === 'INCOME' && t.direction === 'CREDIT') income += t.amount
      else if (type === 'SAVING' && t.direction === 'DEBIT') savings += t.amount
      else if (t.direction === 'DEBIT') expense += t.amount
      if (type) byType[type] += t.amount
    }

    out.push({
      yearMonth: key,
      income:  round(income),
      expense: round(expense),
      savings: round(savings),
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, round(v)]),
      ) as Record<CategoryType, number>,
    })
  }
  return out
}

// ─── Internal query runner ──────────────────────────────────────────

export function runInternalQuery(
  transactions: Transaction[],
  categories: Category[],
  query: InternalQuery,
  now: Date = new Date(),
): QueryResult {
  const [startISO, endISO] = periodWindow(query.period, now)
  const codeToId = Object.fromEntries(categories.map((c) => [c.code, c.id]))
  const wantedId = query.category ? codeToId[query.category] : null

  const matched = transactions.filter((t) => {
    if (t.date < startISO || t.date > endISO) return false
    if (wantedId !== null) {
      // Match the category or any descendant of it (i.e., parent + children).
      if (t.categoryId === null) return false
      if (t.categoryId === wantedId) return true
      const cat = categories.find((c) => c.id === t.categoryId)
      return cat?.parentId === wantedId
    }
    return true
  })

  let value: number | Transaction[]
  let unit: 'INR' | 'count'
  switch (query.metric) {
    case 'sum':
      value = round(matched.reduce((s, t) => s + t.amount, 0))
      unit  = 'INR'
      break
    case 'avg':
      value = matched.length > 0
        ? round(matched.reduce((s, t) => s + t.amount, 0) / matched.length)
        : 0
      unit  = 'INR'
      break
    case 'count':
      value = matched.length
      unit  = 'count'
      break
    case 'list':
      value = matched.slice(0, 50)
      unit  = 'count'
      break
  }

  return {
    metric: query.metric,
    value,
    unit,
    period: query.period,
    matchedTxns: matched.length,
    description: describeQueryResult(query, value, matched.length),
  }
}

function periodWindow(period: InternalQueryPeriod, now: Date): [string, string] {
  function iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const today = iso(now)
  switch (period) {
    case 'this_month': {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      return [start, today]
    }
    case 'last_30_days': {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      return [iso(d), today]
    }
    case 'last_90_days': {
      const d = new Date(now); d.setDate(d.getDate() - 90)
      return [iso(d), today]
    }
    case 'this_year':
      return [`${now.getFullYear()}-01-01`, today]
    case 'last_year':
      return [`${now.getFullYear() - 1}-01-01`, `${now.getFullYear() - 1}-12-31`]
  }
}

function describeQueryResult(q: InternalQuery, value: number | Transaction[], n: number): string {
  const tail = `over ${humanPeriod(q.period)}${q.category ? ` for ${q.category}` : ''}`
  switch (q.metric) {
    case 'sum':   return typeof value === 'number' ? `Spent ₹${value.toLocaleString('en-IN')} ${tail}.` : ''
    case 'avg':   return typeof value === 'number' ? `Average ₹${value.toLocaleString('en-IN')} per transaction ${tail}.` : ''
    case 'count': return `${n} transactions ${tail}.`
    case 'list':  return `Top ${Math.min(50, n)} of ${n} transactions ${tail}.`
  }
}

function humanPeriod(p: InternalQueryPeriod): string {
  switch (p) {
    case 'this_month':   return 'this month'
    case 'last_30_days': return 'the last 30 days'
    case 'last_90_days': return 'the last 90 days'
    case 'this_year':    return 'this year'
    case 'last_year':    return 'last year'
  }
}

function round(v: number, d: number = 2): number {
  const f = Math.pow(10, d); return Math.round(v * f) / f
}
