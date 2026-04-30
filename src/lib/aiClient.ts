import type {
  InterviewRequest,
  InterviewResponse,
  PlanRequest,
  PlanResponse,
  FundsResponse,
  FundPick,
  BucketKey,
} from '../types/v2'
import { validateFundPicks } from './fundValidator'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export class APIError extends Error {
  constructor(public status: number, message: string, public retriable: boolean) {
    super(message)
    this.name = 'APIError'
  }
}

async function postJSON<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const retriable = res.status === 429 || res.status >= 500
    throw new APIError(res.status, text || `Request failed: ${res.status}`, retriable)
  }

  return (await res.json()) as TRes
}

async function getJSON<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!res.ok) {
    const retriable = res.status === 429 || res.status >= 500
    throw new APIError(res.status, `Request failed: ${res.status}`, retriable)
  }
  return (await res.json()) as TRes
}

export async function postInterview(req: InterviewRequest): Promise<InterviewResponse> {
  return postJSON<InterviewRequest, InterviewResponse>('/api/interview', req)
}

export async function postPlan(req: PlanRequest): Promise<PlanResponse> {
  const res = await postJSON<PlanRequest, PlanResponse>('/api/plan', req)
  const report = validateFundPicks(res.plan.fundPicks as Partial<Record<BucketKey, FundPick[]>>)
  return {
    ...res,
    plan: { ...res.plan, fundPicks: report.validated },
  }
}

export async function getFunds(): Promise<FundsResponse> {
  return getJSON<FundsResponse>('/api/funds')
}
