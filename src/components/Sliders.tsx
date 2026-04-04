import type { ReturnAssumptions, UserProfile } from '../types'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { storage } from '../lib/storage'

interface Props {
  profile: UserProfile
  returnAssumptions: ReturnAssumptions
  onProfileChange: (p: UserProfile) => void
  onReturnsChange: (r: ReturnAssumptions) => void
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  color: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, color, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className={`font-bold ${color}`}>{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  )
}

function WithdrawalSlider({ profile, onProfileChange }: { profile: UserProfile; onProfileChange: (p: UserProfile) => void }) {
  const base = profile.monthlyWithdrawal
  const min = Math.round(base * 0.5)
  const max = Math.round(base * 1.5)

  const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">Monthly Withdrawal</span>
        <span className="font-bold text-purple-700">{INR(profile.monthlyWithdrawal)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={profile.monthlyWithdrawal}
        onChange={(e) => {
          const updated = { ...profile, monthlyWithdrawal: parseInt(e.target.value) }
          storage.setProfile(updated)
          onProfileChange(updated)
        }}
        className="w-full accent-purple-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{INR(min)}</span>
        <span>{INR(max)}</span>
      </div>
    </div>
  )
}

export function Sliders({ profile, returnAssumptions, onProfileChange, onReturnsChange }: Props) {
  function updateReturns(key: keyof ReturnAssumptions, val: number) {
    const updated = { ...returnAssumptions, [key]: val }
    onReturnsChange(updated)
  }

  function updateInflation(val: number) {
    const updated = { ...profile, inflationRate: val }
    storage.setProfile(updated)
    onProfileChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assumption Sliders</CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">Adjust to see real-time impact on SWP projections</p>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <SliderRow
            label="Inflation Rate"
            value={profile.inflationRate}
            min={3}
            max={12}
            step={0.5}
            color="text-orange-600"
            onChange={updateInflation}
          />
          <SliderRow
            label="B1 Return (Liquid/SCSS/FD)"
            value={returnAssumptions.b1}
            min={5}
            max={9}
            step={0.5}
            color="text-blue-700"
            onChange={(v) => updateReturns('b1', v)}
          />
        </div>
        <div className="space-y-5">
          <SliderRow
            label="B2 Return (Debt MF/BAF)"
            value={returnAssumptions.b2}
            min={6}
            max={10}
            step={0.5}
            color="text-amber-700"
            onChange={(v) => updateReturns('b2', v)}
          />
          <SliderRow
            label="B3 Return (Equity/Gold)"
            value={returnAssumptions.b3}
            min={8}
            max={15}
            step={0.5}
            color="text-green-700"
            onChange={(v) => updateReturns('b3', v)}
          />
        </div>
        <div className="md:col-span-2">
          <WithdrawalSlider profile={profile} onProfileChange={onProfileChange} />
        </div>
      </div>
    </Card>
  )
}
