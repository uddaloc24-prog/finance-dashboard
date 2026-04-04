import { useState } from 'react'
import type { MarketData } from '../types'
import { storage } from '../lib/storage'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

interface Props {
  data: MarketData | null
  loading: boolean
  onRefresh: () => void
  onDataChange: (d: MarketData) => void
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ v }: { v: number | null }) {
  if (v === null) return <span className="text-gray-400 text-xs">—</span>
  const positive = v >= 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {positive ? '▲' : '▼'} {Math.abs(v).toFixed(2)}%
    </span>
  )
}

function Stale({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-xs text-gray-400">Never refreshed</span>
  const d = new Date(ts)
  return (
    <span className="text-xs text-gray-400">
      Updated {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

const BUCKET_COLORS: Record<string, string> = {
  b1: 'text-blue-600',
  b2: 'text-amber-600',
  b3: 'text-green-600',
}

const BUCKET_LABELS: Record<string, string> = {
  b1: 'B1',
  b2: 'B2',
  b3: 'B3',
}

export function MarketPanel({ data, loading, onRefresh, onDataChange }: Props) {
  const [editingScss, setEditingScss] = useState(false)
  const [scssInput, setScssInput] = useState('')
  const [editingFd, setEditingFd] = useState(false)
  const [fdInput, setFdInput] = useState({ SBI: '', HDFC: '', ICICI: '' })

  function saveScss() {
    const rate = parseFloat(scssInput)
    if (isNaN(rate) || rate < 0 || rate > 20) return
    storage.setScssOverride(rate)
    if (data) {
      const updated = { ...data, scssRate: rate }
      storage.setMarket(updated)
      onDataChange(updated)
    }
    setEditingScss(false)
  }

  function saveFd() {
    const rates = {
      SBI: parseFloat(fdInput.SBI) || data?.fdRates.SBI || 7.25,
      HDFC: parseFloat(fdInput.HDFC) || data?.fdRates.HDFC || 7.40,
      ICICI: parseFloat(fdInput.ICICI) || data?.fdRates.ICICI || 7.35,
    }
    storage.setFdOverride(rates)
    if (data) {
      const updated = { ...data, fdRates: rates }
      storage.setMarket(updated)
      onDataChange(updated)
    }
    setEditingFd(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Market Data</CardTitle>
          <div className="flex items-center gap-3">
            {data && <Stale ts={data.lastRefreshed} />}
            <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Indices */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Indices</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-gray-700">Nifty 50</span>
              <div className="text-right">
                <div className="font-bold text-gray-900">{fmt(data?.nifty ?? null, 2)}</div>
                <ChangeChip v={data?.niftChange ?? null} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-gray-700">Sensex</span>
              <div className="text-right">
                <div className="font-bold text-gray-900">{fmt(data?.sensex ?? null, 2)}</div>
                <ChangeChip v={data?.sensexChange ?? null} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-gray-700">Gold (₹/10g)</span>
              <div className="text-right">
                <div className="font-bold text-gray-900">
                  {data?.gold ? '₹' + fmt(data.gold) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* SCSS & FD rates */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-5 mb-3">Fixed Rates</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">SCSS</span>
              {editingScss ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={scssInput}
                    onChange={(e) => setScssInput(e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-sm"
                    placeholder={String(data?.scssRate ?? 8.2)}
                  />
                  <Button size="sm" onClick={saveScss}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingScss(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-700">{data?.scssRate ?? 8.2}%</span>
                  <button onClick={() => { setScssInput(String(data?.scssRate ?? 8.2)); setEditingScss(true) }} className="text-xs text-gray-400 hover:text-blue-600">Edit</button>
                </div>
              )}
            </div>

            {editingFd ? (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {(['SBI', 'HDFC', 'ICICI'] as const).map((bank) => (
                  <div key={bank} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{bank} FD</span>
                    <input
                      type="number"
                      step="0.05"
                      value={fdInput[bank]}
                      onChange={(e) => setFdInput((prev) => ({ ...prev, [bank]: e.target.value }))}
                      className="w-20 border rounded px-2 py-1 text-sm"
                      placeholder={String(data?.fdRates?.[bank] ?? '')}
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={saveFd}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingFd(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {data?.fdRates && (['SBI', 'HDFC', 'ICICI'] as const).map((bank) => (
                  <div key={bank} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{bank} FD</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-700">{data.fdRates[bank]}%</span>
                    </div>
                  </div>
                ))}
                <button onClick={() => {
                  setFdInput({ SBI: String(data?.fdRates.SBI ?? ''), HDFC: String(data?.fdRates.HDFC ?? ''), ICICI: String(data?.fdRates.ICICI ?? '') })
                  setEditingFd(true)
                }} className="text-xs text-gray-400 hover:text-blue-600">Edit FD rates</button>
              </>
            )}
          </div>
        </div>

        {/* MF NAVs */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mutual Fund NAVs</p>
          {!data?.mfNavs?.length ? (
            <p className="text-sm text-gray-400">No NAV data yet — click Refresh</p>
          ) : (
            <div className="space-y-2">
              {data.mfNavs.map((mf) => (
                <div key={mf.schemeCode} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800 leading-tight">{mf.schemeName}</div>
                    <Badge variant={mf.bucket === 'b1' ? 'blue' : mf.bucket === 'b2' ? 'amber' : 'green'}>
                      {BUCKET_LABELS[mf.bucket]}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${BUCKET_COLORS[mf.bucket]}`}>₹{mf.nav.toFixed(2)}</div>
                    {mf.oneYearReturn !== null && (
                      <div className={`text-xs ${mf.oneYearReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mf.oneYearReturn >= 0 ? '▲' : '▼'} {Math.abs(mf.oneYearReturn)}% (1yr)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data?.nifty === null && (
            <p className="text-xs text-amber-600 mt-4 bg-amber-50 rounded-lg p-2">
              ℹ️ Nifty/Sensex unavailable — NSE blocks direct browser requests. Data shown when available via proxy.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
