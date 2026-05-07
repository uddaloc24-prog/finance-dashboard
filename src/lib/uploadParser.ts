// Upload parser — accepts PDF / DOCX / XLSX / MD / CSV / JSON / TXT files
// and pulls common retirement-plan fields out of them. Heavy parser libs
// are lazy-loaded so the home page bundle stays small.

import type { UserProfile, BucketState, Demographics, ExpenseProfile } from '../types'
import type { UserIdentity } from '../types/identity'

export interface ParsedPlan {
  identity?: Partial<UserIdentity>
  profile?: Partial<UserProfile>
  buckets?: Partial<BucketState>
  rawTextSample: string
  rawTextFull?: string  // full extracted text — populated for downstream parsers (e.g. CAS portfolio total)
  fileName: string
  fileFormat: string
  bytesRead: number
  matchedFields: string[]
}

const TEXT_FORMATS = new Set(['md', 'markdown', 'txt', 'csv', 'json'])

export async function parseUploadedFile(file: File): Promise<ParsedPlan> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  let text = ''
  let directObj: unknown = null

  if (TEXT_FORMATS.has(ext)) {
    text = await file.text()
    if (ext === 'json') {
      try {
        directObj = JSON.parse(text)
      } catch {
        // fall through to regex parsing
      }
    }
  } else if (ext === 'pdf') {
    text = await extractPdfText(file)
  } else if (ext === 'docx') {
    text = await extractDocxText(file)
  } else if (ext === 'xlsx' || ext === 'xls') {
    text = await extractXlsxText(file)
  } else {
    throw new Error(`Unsupported file type: .${ext || 'unknown'}. Try PDF, DOCX, XLSX, MD, CSV, JSON, or TXT.`)
  }

  if (directObj && typeof directObj === 'object' && directObj !== null) {
    const obj = directObj as Record<string, unknown>
    const matched: string[] = []
    if (obj.identity) matched.push('identity')
    if (obj.profile) matched.push('profile')
    if (obj.buckets) matched.push('buckets')
    if (matched.length > 0) {
      return {
        identity: obj.identity as Partial<UserIdentity>,
        profile: obj.profile as Partial<UserProfile>,
        buckets: obj.buckets as Partial<BucketState>,
        rawTextSample: text.slice(0, 400),
        rawTextFull: text,
        fileName: file.name,
        fileFormat: ext,
        bytesRead: text.length,
        matchedFields: matched,
      }
    }
  }

  const extracted = extractFields(text)
  return {
    ...extracted.data,
    rawTextSample: text.slice(0, 400),
    rawTextFull: text,
    fileName: file.name,
    fileFormat: ext,
    bytesRead: text.length,
    matchedFields: extracted.matched,
  }
}

// ── PDF text extraction (lazy) ────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Vite resolves the worker URL via ?url; this becomes its own chunk.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const text = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}

// ── DOCX text extraction (lazy) ───────────────────────────────────────

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

// ── XLSX text extraction (lazy) ───────────────────────────────────────

async function extractXlsxText(file: File): Promise<string> {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  return wb.SheetNames.map((name: string) => {
    const sheet = wb.Sheets[name]
    return `=== ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`
  }).join('\n\n')
}

// ── Field extraction via regex ────────────────────────────────────────

interface ExtractedData {
  identity?: Partial<UserIdentity>
  profile?: Partial<UserProfile>
  buckets?: Partial<BucketState>
}

function extractFields(text: string): { data: ExtractedData; matched: string[] } {
  const identity: Partial<UserIdentity> = {}
  const profile: Partial<UserProfile> = {}
  const buckets: Partial<BucketState> = {}
  const demographics: Partial<Demographics> = {}
  const expenses: Partial<ExpenseProfile> = {}
  const matched: string[] = []

  // Identity ──────────────────────────────────────────────────────────

  const fullName = pickName(text)
  if (fullName) {
    identity.fullName = fullName
    matched.push('Full name')
  }

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  if (emailMatch) {
    identity.email = emailMatch[0]
    matched.push('Email')
  }

  const panMatch = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)
  if (panMatch) {
    identity.panCard = panMatch[0]
    matched.push('PAN')
  }

  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)
  if (phoneMatch) {
    identity.phone = phoneMatch[0].trim()
    matched.push('Phone')
  }

  const dobMatch = text.match(/(?:date\s*of\s*birth|dob|born)[\s:|*,]*(\d{4}-\d{2}-\d{2})/i)
  if (dobMatch) {
    identity.dateOfBirth = dobMatch[1]
    matched.push('Date of birth')
  }

  // Profile ─ Corpus / Withdrawal ─────────────────────────────────────

  const corpus = matchAmount(text, /(?:total\s+corpus|^\s*corpus\b)/im)
  if (corpus != null) {
    profile.corpus = corpus
    matched.push('Total corpus')
  }

  const draw = matchAmount(text, /monthly\s+(?:withdrawal|draw|income)/i)
  if (draw != null) {
    profile.monthlyWithdrawal = draw
    profile.withdrawalAmount = draw
    matched.push('Monthly withdrawal')
  }

  const sip = matchAmount(text, /(?:monthly\s+)?(?:sip|systematic\s+investment|passive\s+income)/i)
  if (sip != null) {
    profile.sipAmount = sip
    matched.push('SIP / passive income')
  }

  const inflation = matchPercent(text, /general\s*inflation|inflation\s*rate/i)
  if (inflation != null) {
    profile.inflationRate = inflation
    matched.push('Inflation rate')
  }

  // Demographics ──────────────────────────────────────────────────────

  const cur = matchInt(text, /current\s+age/i)
  if (cur != null) demographics.currentAge = cur
  const ret = matchInt(text, /retirement\s+age/i)
  if (ret != null) demographics.retirementAge = ret
  const life = matchInt(text, /life\s+expectancy/i)
  if (life != null) demographics.lifeExpectancy = life

  if (Object.keys(demographics).length > 0) {
    profile.demographics = demographics as Demographics
    matched.push('Demographics')
  }

  // Expenses ──────────────────────────────────────────────────────────

  const ess = matchAmount(text, /essential(?:s)?/i)
  const lif = matchAmount(text, /lifestyle/i)
  const hea = matchAmount(text, /healthcare/i)
  const edu = matchAmount(text, /education/i)
  if ([ess, lif, hea, edu].some((v) => v != null)) {
    expenses.essential = ess ?? 0
    expenses.lifestyle = lif ?? 0
    expenses.healthcare = hea ?? 0
    expenses.education = edu ?? 0
    profile.expenses = expenses as ExpenseProfile
    matched.push('Expenses')
  }

  // Buckets ───────────────────────────────────────────────────────────

  const b1 = matchBucket(text, '1', 'liquidity')
  const b2 = matchBucket(text, '2', 'fixed\\s*floor')
  const b3 = matchBucket(text, '3', 'stability')
  const b4 = matchBucket(text, '4', 'growth')
  if (b1 != null) buckets.b1 = b1
  if (b2 != null) buckets.b2 = b2
  if (b3 != null) buckets.b3 = b3
  if (b4 != null) buckets.b4 = b4
  if (Object.keys(buckets).length > 0) matched.push('Bucket allocation')

  return {
    data: {
      identity: Object.keys(identity).length > 0 ? identity : undefined,
      profile: Object.keys(profile).length > 0 ? profile : undefined,
      buckets: Object.keys(buckets).length > 0 ? buckets : undefined,
    },
    matched,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function parseINR(s: string): number | undefined {
  const trimmed = s.replace(/[₹\s]/g, '')
  const crMatch = trimmed.match(/^([\d.,]+)\s*(?:cr|crore)/i)
  if (crMatch) {
    const n = parseFloat(crMatch[1].replace(/,/g, ''))
    return isNaN(n) ? undefined : Math.round(n * 1e7)
  }
  const lMatch = trimmed.match(/^([\d.,]+)\s*l(?:akh|ac)?/i)
  if (lMatch) {
    const n = parseFloat(lMatch[1].replace(/,/g, ''))
    return isNaN(n) ? undefined : Math.round(n * 1e5)
  }
  const kMatch = trimmed.match(/^([\d.,]+)\s*k$/i)
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(/,/g, ''))
    return isNaN(n) ? undefined : Math.round(n * 1e3)
  }
  const n = parseFloat(trimmed.replace(/,/g, ''))
  return isNaN(n) ? undefined : Math.round(n)
}

// Find a labelled monetary amount: "label: ₹value" or "label,value" or "| label | value |".
// Captures the numeric portion plus an optional unit (Cr / L / K).
function matchAmount(text: string, labelRe: RegExp): number | undefined {
  const labelSrc = labelRe.source
  const flags = labelRe.flags.includes('i') ? 'i' : ''
  const re = new RegExp(`(${labelSrc})[\\s:|,*]*(?:\\*\\*)?₹?\\s*([\\d.,]+(?:\\s*(?:cr|crore|l|lakh|lac|k))?)`, flags)
  const m = text.match(re)
  if (!m) return undefined
  return parseINR(m[2])
}

function matchInt(text: string, labelRe: RegExp): number | undefined {
  const labelSrc = labelRe.source
  const flags = labelRe.flags.includes('i') ? 'i' : ''
  const re = new RegExp(`(${labelSrc})[\\s:|,*]*(?:\\*\\*)?(\\d{1,3})`, flags)
  const m = text.match(re)
  if (!m) return undefined
  const n = parseInt(m[2], 10)
  return isNaN(n) ? undefined : n
}

function matchPercent(text: string, labelRe: RegExp): number | undefined {
  const labelSrc = labelRe.source
  const flags = labelRe.flags.includes('i') ? 'i' : ''
  const re = new RegExp(`(${labelSrc})[\\s:|,*]*(?:\\*\\*)?(\\d+(?:\\.\\d+)?)\\s*%?`, flags)
  const m = text.match(re)
  if (!m) return undefined
  const n = parseFloat(m[2])
  return isNaN(n) ? undefined : n
}

function matchBucket(text: string, num: string, alias: string): number | undefined {
  // Try "B<n> ... ₹<value>", "Bucket <n> ... ₹<value>", and the named alias.
  const patterns = [
    new RegExp(`B${num}[^\\d₹]{0,40}₹?\\s*([\\d.,]+(?:\\s*(?:cr|crore|l|lakh|lac|k))?)`, 'i'),
    new RegExp(`Bucket\\s*${num}[^\\d₹]{0,60}₹?\\s*([\\d.,]+(?:\\s*(?:cr|crore|l|lakh|lac|k))?)`, 'i'),
    new RegExp(`${alias}[^\\d₹]{0,60}₹?\\s*([\\d.,]+(?:\\s*(?:cr|crore|l|lakh|lac|k))?)`, 'i'),
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const n = parseINR(m[1])
      if (n != null && n > 0) return n
    }
  }
  return undefined
}

// Extract a name following a "Generated for" / "Full name" / "Name" label.
// Stop at a newline, table separator, or two consecutive spaces.
function pickName(text: string): string | undefined {
  const patterns = [
    /generated\s+for[\s:|,*]*(?:\*\*)?([A-Z][A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\*\*|[\n\r|]|\s{2,}|$)/i,
    /full\s+name[\s:|,*]*(?:\*\*)?([A-Z][A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\*\*|[\n\r|]|\s{2,}|$)/i,
    /^name[\s:|,*]+(?:\*\*)?([A-Z][A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\*\*|[\n\r|]|\s{2,}|$)/im,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const name = m[1].trim().replace(/[*]+/g, '').trim()
      if (name.length >= 2 && /[A-Za-z]/.test(name)) return name
    }
  }
  return undefined
}
