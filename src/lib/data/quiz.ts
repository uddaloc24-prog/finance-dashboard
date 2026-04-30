import type { QuizQuestion } from '../../types/profiles'

// 10-question risk profiler. Section A (Q1–3): time horizon & demographics.
// Section B (Q4–7): risk capacity & psychology. Section C (Q8–10): goals & complexity.
// Each option scores 1–5; total range 10–50.

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── Section A: time horizon & demographics ─────────────────────────────
  {
    id: 'q1-horizon',
    section: 'A',
    question: 'How many years of retirement do you need this corpus to fund?',
    options: [
      { label: 'Less than 10 years', score: 1 },
      { label: '10 to 15 years', score: 2 },
      { label: '15 to 20 years', score: 3 },
      { label: '20 to 30 years', score: 4 },
      { label: 'More than 30 years (early retirement / FIRE)', score: 5 },
    ],
  },
  {
    id: 'q2-secondary-income',
    section: 'A',
    question: 'Do you have any income outside this corpus (pension, rental, part-time work, spouse working)?',
    options: [
      { label: 'No — this corpus is my only retirement income', score: 1 },
      { label: 'A small amount (< 15% of needs)', score: 2 },
      { label: 'Moderate (15–35% of needs)', score: 3 },
      { label: 'Significant (35–60% of needs)', score: 4 },
      { label: 'Majority — corpus is supplemental', score: 5 },
    ],
  },
  {
    id: 'q3-essential-share',
    section: 'A',
    question: 'What share of your monthly expenses are non-negotiable essentials (rent, food, healthcare)?',
    options: [
      { label: 'Almost all of it (>85%)', score: 1 },
      { label: 'Most (70–85%)', score: 2 },
      { label: 'About half (50–70%)', score: 3 },
      { label: 'Less than half (30–50%)', score: 4 },
      { label: 'Mostly lifestyle/discretionary (<30%)', score: 5 },
    ],
  },
  // ── Section B: risk capacity & psychology ──────────────────────────────
  {
    id: 'q4-crash-reaction',
    section: 'B',
    question: 'Your portfolio drops 30% in a year. What do you do?',
    options: [
      { label: 'Sell everything and switch to FDs', score: 1 },
      { label: 'Sell most equity, keep some', score: 2 },
      { label: 'Hold steady — wait for recovery', score: 3 },
      { label: 'Hold and rebalance back to target allocation', score: 4 },
      { label: 'Buy more — markets are on sale', score: 5 },
    ],
  },
  {
    id: 'q5-volatility-tolerance',
    section: 'B',
    question: 'In a typical year, what monthly variation in portfolio value can you stomach?',
    options: [
      { label: 'I want my balance only going up', score: 1 },
      { label: 'Up to ±5% is OK', score: 2 },
      { label: 'Up to ±15% is OK', score: 3 },
      { label: 'Up to ±25% is OK', score: 4 },
      { label: 'I don\'t check often — volatility is normal', score: 5 },
    ],
  },
  {
    id: 'q6-investing-experience',
    section: 'B',
    question: 'How experienced are you with mutual funds and equity investing?',
    options: [
      { label: 'Never invested in equity / mutual funds', score: 1 },
      { label: 'Some FDs and tax-saver MFs', score: 2 },
      { label: 'Active SIP investor for 5+ years', score: 3 },
      { label: 'Manage my own diversified portfolio', score: 4 },
      { label: 'Sophisticated — derivatives, international, REITs', score: 5 },
    ],
  },
  {
    id: 'q7-emergency-fund',
    section: 'B',
    question: 'Outside this retirement corpus, how much emergency cash do you have?',
    options: [
      { label: 'None — this corpus is everything', score: 1 },
      { label: 'Up to 3 months of expenses', score: 2 },
      { label: '3 to 12 months of expenses', score: 3 },
      { label: '1 to 2 years of expenses', score: 4 },
      { label: 'More than 2 years separately', score: 5 },
    ],
  },
  // ── Section C: goals & complexity ──────────────────────────────────────
  {
    id: 'q8-legacy',
    section: 'C',
    question: 'How important is it to leave a corpus to children/family?',
    options: [
      { label: 'Not at all — spend every rupee', score: 5 },
      { label: 'Nice but not a priority', score: 4 },
      { label: 'Moderately important', score: 3 },
      { label: 'Very important', score: 2 },
      { label: 'Critical — must leave at least starting corpus', score: 1 },
    ],
  },
  {
    id: 'q9-inflation-priority',
    section: 'C',
    question: 'How concerned are you about your monthly income keeping pace with inflation 15–20 years from now?',
    options: [
      { label: 'Not concerned — I just need today\'s number', score: 1 },
      { label: 'Slightly concerned', score: 2 },
      { label: 'Moderately concerned', score: 3 },
      { label: 'Very concerned', score: 4 },
      { label: 'My #1 priority — real income must grow', score: 5 },
    ],
  },
  {
    id: 'q10-management-effort',
    section: 'C',
    question: 'How much time/effort can you commit to managing the portfolio annually?',
    options: [
      { label: 'Set-and-forget — once per year max', score: 1 },
      { label: 'A couple of reviews per year', score: 2 },
      { label: 'Quarterly check-ins, occasional rebalance', score: 3 },
      { label: 'Monthly review with active rebalancing', score: 4 },
      { label: 'Weekly active management', score: 5 },
    ],
  },
]

export const QUIZ_TOTAL_QUESTIONS = QUIZ_QUESTIONS.length
export const QUIZ_MIN_SCORE = QUIZ_TOTAL_QUESTIONS  // 10
export const QUIZ_MAX_SCORE = QUIZ_TOTAL_QUESTIONS * 5  // 50
