import type { ReturnAssumptions } from '../types'
import { computeTaxRows } from '../lib/calculations'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'

interface Props {
  returnAssumptions: ReturnAssumptions
  taxBracket: number
  scssRate: number
  fdRates: { SBI: number; HDFC: number; ICICI: number }
  annualCorpus: number
}

const BUCKET_BADGE: Record<string, 'blue' | 'amber' | 'green'> = {
  B1: 'blue', B2: 'amber', B3: 'green',
}

export function TaxOverlay({ returnAssumptions, taxBracket, scssRate, fdRates, annualCorpus }: Props) {
  const annualB3Gains = annualCorpus * 0.47 * (returnAssumptions.b3 / 100)
  const rows = computeTaxRows(returnAssumptions, taxBracket, scssRate, fdRates, annualB3Gains)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Overlay</CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">
          Pre-tax vs post-tax returns at {taxBracket}% bracket · Equity LTCG 12.5% above ₹1.25L
        </p>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 font-medium">Instrument</th>
              <th className="pb-2 font-medium">Bucket</th>
              <th className="pb-2 font-medium text-right">Pre-tax Return</th>
              <th className="pb-2 font-medium text-right">Effective Tax</th>
              <th className="pb-2 font-medium text-right">Post-tax Return</th>
              <th className="pb-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.instrument} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2.5 font-medium text-gray-800">{row.instrument}</td>
                <td className="py-2.5">
                  <Badge variant={BUCKET_BADGE[row.bucket] ?? 'gray'}>{row.bucket}</Badge>
                </td>
                <td className="py-2.5 text-right font-medium text-gray-700">{row.preTaxReturn}%</td>
                <td className="py-2.5 text-right text-red-600">{row.taxRate}%</td>
                <td className="py-2.5 text-right font-bold text-green-700">{row.postTaxReturn}%</td>
                <td className="py-2.5 text-xs text-gray-400 max-w-xs">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Returns are illustrative based on your assumptions. Consult a CA for actual tax liability.
      </p>
    </Card>
  )
}
