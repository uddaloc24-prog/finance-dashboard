import { useState } from 'react'

// ── Question definitions ──────────────────────────────────────────

interface Option {
  label: string
  score: number            // added to raw risk score (higher = more aggressive)
  bucketShift?: {          // shifts bucket allocation %
    b2?: number            // positive = more to B2 (safer)
    b3?: number
  }
}

interface Question {
  id: string
  text: string
  options: Option[]
}

interface Section {
  title: string
  icon: string
  questions: Question[]
}

const SECTIONS: Section[] = [
  {
    title: 'Demographics',
    icon: '👤',
    questions: [
      {
        id: 'age',
        text: 'Your age group',
        options: [
          { label: '40–50', score: 4 },
          { label: '50–60', score: 3 },
          { label: '60–70', score: 2 },
          { label: '70+', score: 0, bucketShift: { b2: 20 } },
        ],
      },
      {
        id: 'location',
        text: 'Where do you live?',
        options: [
          { label: 'Metro', score: 3 },
          { label: 'Tier 1', score: 2 },
          { label: 'Tier 2', score: 1, bucketShift: { b2: 10 } },
          { label: 'Rural', score: 0, bucketShift: { b2: 10 } },
        ],
      },
      {
        id: 'dependents',
        text: 'Family dependents',
        options: [
          { label: 'None', score: 4 },
          { label: '1–2', score: 3 },
          { label: '3–5', score: 1 },
          { label: '6+', score: 0, bucketShift: { b2: 15 } },
        ],
      },
    ],
  },
  {
    title: 'Financial Background',
    icon: '📊',
    questions: [
      {
        id: 'education',
        text: 'Highest education',
        options: [
          { label: 'Graduate', score: 2 },
          { label: 'Post-Graduate', score: 3 },
          { label: 'CA / CFA', score: 4 },
          { label: 'Other', score: 1 },
        ],
      },
      {
        id: 'finKnowledge',
        text: 'Finance knowledge',
        options: [
          { label: 'Beginner', score: 0, bucketShift: { b3: 10 } },
          { label: 'Intermediate', score: 2 },
          { label: 'Advanced', score: 3 },
          { label: 'Expert', score: 4 },
        ],
      },
      {
        id: 'experience',
        text: 'Investing experience (years)',
        options: [
          { label: '0–5', score: 1 },
          { label: '5–10', score: 2 },
          { label: '10–20', score: 3 },
          { label: '20+', score: 4 },
        ],
      },
    ],
  },
  {
    title: 'Psychological Factors',
    icon: '🧠',
    questions: [
      {
        id: 'marketDrop',
        text: 'If the market drops 20%, you would…',
        options: [
          { label: 'Sleep fine', score: 4 },
          { label: 'Lose 1–2 nights', score: 2 },
          { label: 'Worry for a week', score: 1 },
          { label: 'Panic sell', score: 0, bucketShift: { b2: 25 } },
        ],
      },
      {
        id: 'decisionStyle',
        text: 'How do you make investment decisions?',
        options: [
          { label: 'Data-driven', score: 4 },
          { label: 'Advisor-led', score: 3 },
          { label: 'Follow peers', score: 1 },
          { label: 'Gut feel', score: 2 },
        ],
      },
      {
        id: 'inheritance',
        text: 'Your inheritance / legacy mindset',
        options: [
          { label: 'Preserve capital', score: 1 },
          { label: 'Grow moderately', score: 3 },
          { label: 'Maximize growth', score: 4 },
        ],
      },
    ],
  },
  {
    title: 'Regional & Cultural',
    icon: '🏛️',
    questions: [
      {
        id: 'language',
        text: 'Primary language',
        options: [
          { label: 'English', score: 3 },
          { label: 'Hindi', score: 2 },
          { label: 'Regional', score: 1 },
        ],
      },
      {
        id: 'communityNorm',
        text: 'Community investment norm',
        options: [
          { label: 'Fixed Deposits', score: 0, bucketShift: { b2: 20 } },
          { label: 'Real Estate', score: 2 },
          { label: 'Equity', score: 4 },
          { label: 'Gold', score: 1 },
        ],
      },
      {
        id: 'riskSource',
        text: 'Who influences your risk decisions?',
        options: [
          { label: 'Self', score: 4 },
          { label: 'Family elders', score: 2 },
          { label: 'Community', score: 1 },
          { label: 'Advisor', score: 3 },
        ],
      },
    ],
  },
  {
    title: 'Family Responsibility',
    icon: '🏠',
    questions: [
      {
        id: 'earner',
        text: 'Primary earner in your household',
        options: [
          { label: 'Self', score: 2 },
          { label: 'Spouse', score: 3 },
          { label: 'Children', score: 3 },
          { label: 'Pension', score: 1 },
        ],
      },
      {
        id: 'healthcare',
        text: 'Healthcare coverage',
        options: [
          { label: 'Full', score: 4 },
          { label: 'Partial', score: 2 },
          { label: 'None', score: 0 },
        ],
      },
      {
        id: 'emergencyFund',
        text: 'Emergency fund',
        options: [
          { label: '6+ months', score: 4 },
          { label: '3–6 months', score: 2 },
          { label: '<3 months', score: 1 },
          { label: 'None', score: 0 },
        ],
      },
    ],
  },
]

const ALL_QUESTIONS = SECTIONS.flatMap(s => s.questions)
const MAX_RAW_SCORE = ALL_QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map(o => o.score)),
  0,
)

// ── Scoring logic ─────────────────────────────────────────────────

export interface RiskResult {
  riskScore: 1 | 2 | 3 | 4 | 5
  label: string
  allocation: { b1: number; b2: number; b3: number; b4: number } // percentages summing to 100
  answers: Record<string, number>                                 // question id → option index
}

function computeResult(answers: Record<string, number>): RiskResult {
  let rawScore = 0
  let b2Shift = 0
  let b3Shift = 0

  for (const q of ALL_QUESTIONS) {
    const idx = answers[q.id]
    if (idx === undefined) continue
    const opt = q.options[idx]
    rawScore += opt.score
    b2Shift += opt.bucketShift?.b2 ?? 0
    b3Shift += opt.bucketShift?.b3 ?? 0
  }

  // Normalize raw score to 1-5
  const pct = rawScore / MAX_RAW_SCORE
  const riskScore: 1 | 2 | 3 | 4 | 5 =
    pct >= 0.8 ? 5 : pct >= 0.6 ? 4 : pct >= 0.4 ? 3 : pct >= 0.2 ? 2 : 1

  const labels: Record<number, string> = {
    1: 'Very Conservative',
    2: 'Conservative',
    3: 'Moderate',
    4: 'Aggressive',
    5: 'Very Aggressive',
  }

  // Start from HDFC default 10/20/30/40, apply shifts
  // Shifts move weight towards B2 (safer) at expense of B4 (equity)
  // b3Shift adds to B3 from B4
  const totalShift = Math.min(b2Shift, 30) // cap at 30% max shift
  const b3ShiftCapped = Math.min(b3Shift, 15)

  let b1 = 10
  let b2 = 20 + totalShift
  let b3 = 30 + b3ShiftCapped
  let b4 = 40 - totalShift - b3ShiftCapped

  // Ensure B4 never goes below 10%
  if (b4 < 10) {
    const deficit = 10 - b4
    b4 = 10
    b2 -= deficit
  }

  // Normalize to 100
  const sum = b1 + b2 + b3 + b4
  b1 = Math.round((b1 / sum) * 100)
  b2 = Math.round((b2 / sum) * 100)
  b3 = Math.round((b3 / sum) * 100)
  b4 = 100 - b1 - b2 - b3

  return {
    riskScore,
    label: labels[riskScore],
    allocation: { b1, b2, b3, b4 },
    answers,
  }
}

// ── Component ─────────────────────────────────────────────────────

interface Props {
  onComplete: (result: RiskResult) => void
  onSkip: () => void
}

const RISK_COLORS: Record<number, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  2: { bg: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
  3: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  4: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  5: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
}

export function RiskProfiler({ onComplete, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentSection, setCurrentSection] = useState(0)

  const answered = Object.keys(answers).length
  const total = ALL_QUESTIONS.length
  const allDone = answered === total
  const progress = Math.round((answered / total) * 100)

  const section = SECTIONS[currentSection]
  const sectionAnswered = section.questions.every(q => answers[q.id] !== undefined)

  function selectOption(qId: string, optIdx: number) {
    setAnswers(prev => ({ ...prev, [qId]: optIdx }))
  }

  function handleFinish() {
    if (!allDone) return
    onComplete(computeResult(answers))
  }

  const preview = allDone ? computeResult(answers) : null
  const previewColors = preview ? RISK_COLORS[preview.riskScore] : null

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Risk Assessment
          </p>
          <span className="text-xs text-gray-400">{answered}/{total} answered</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((s, i) => {
          const sAnswered = s.questions.every(q => answers[q.id] !== undefined)
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSection(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                i === currentSection
                  ? 'bg-blue-600 text-white'
                  : sAnswered
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
              {sAnswered && i !== currentSection && <span>&#10003;</span>}
            </button>
          )
        })}
      </div>

      {/* Questions for current section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="text-lg">{section.icon}</span>
          {section.title}
        </h3>

        {section.questions.map(q => (
          <div key={q.id} className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectOption(q.id, i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    answers[q.id] === i
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentSection(i => Math.max(0, i - 1))}
          disabled={currentSection === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
        >
          Previous
        </button>
        {currentSection < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentSection(i => Math.min(SECTIONS.length - 1, i + 1))}
            disabled={!sectionAnswered}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Next Section
          </button>
        ) : null}
      </div>

      {/* Result preview */}
      {preview && previewColors && (
        <div className={`rounded-xl border p-5 ${previewColors.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Risk Profile</p>
              <p className={`text-2xl font-bold mt-1 ${previewColors.text}`}>
                {preview.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Score: {preview.riskScore}/5
              </p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold ${previewColors.bar}`}>
              {preview.riskScore}
            </div>
          </div>

          {/* Recommended allocation */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recommended Bucket Allocation
          </p>
          <div className="flex rounded-full overflow-hidden h-4 mb-3">
            <div className="bg-blue-500 transition-all" style={{ width: `${preview.allocation.b1}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${preview.allocation.b2}%` }} />
            <div className="bg-emerald-500 transition-all" style={{ width: `${preview.allocation.b3}%` }} />
            <div className="bg-purple-500 transition-all" style={{ width: `${preview.allocation.b4}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xs font-bold text-blue-600">B1</p>
              <p className="text-sm font-bold text-gray-800">{preview.allocation.b1}%</p>
              <p className="text-xs text-gray-400">Liquid</p>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600">B2</p>
              <p className="text-sm font-bold text-gray-800">{preview.allocation.b2}%</p>
              <p className="text-xs text-gray-400">Fixed</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600">B3</p>
              <p className="text-sm font-bold text-gray-800">{preview.allocation.b3}%</p>
              <p className="text-xs text-gray-400">Hybrid</p>
            </div>
            <div>
              <p className="text-xs font-bold text-purple-600">B4</p>
              <p className="text-sm font-bold text-gray-800">{preview.allocation.b4}%</p>
              <p className="text-xs text-gray-400">Equity</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply This Profile
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Set Manually
            </button>
          </div>
        </div>
      )}

      {/* Skip link at bottom */}
      {!allDone && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Skip assessment — set risk manually
          </button>
        </div>
      )}
    </div>
  )
}
