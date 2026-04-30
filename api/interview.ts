import type { InterviewRequest, InterviewResponse, InterviewTurn } from '../src/types/v2'

export const config = { runtime: 'edge' }

const SCRIPTED_QUESTIONS = [
  "What's your current corpus, and roughly how is it split — bank/FD vs mutual funds vs real estate vs EPF/PPF/NPS?",
  "Are you retired already, or planning to stop working in the next few years? What year do you hope to retire?",
  "In plain English, what do you want this money to do over the next 20–30 years? Monthly income, big events like weddings/education, something to leave behind?",
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: InterviewRequest
  try {
    body = (await req.json()) as InterviewRequest
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userTurnCount = body.session.turns.filter((t) => t.role === 'user').length
  const nextIdx = Math.min(userTurnCount, SCRIPTED_QUESTIONS.length - 1)
  const isReady = userTurnCount >= SCRIPTED_QUESTIONS.length

  const nextTurn: InterviewTurn = {
    role: 'ai',
    content: isReady
      ? 'Great — I have what I need. Generating your plan now.'
      : SCRIPTED_QUESTIONS[nextIdx],
    timestamp: new Date().toISOString(),
  }

  const res: InterviewResponse = {
    nextTurn,
    status: isReady ? 'ready-to-plan' : 'asking',
    profileSoFar: body.session.profileSoFar,
    goalsSoFar: body.session.goalsSoFar,
  }

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
