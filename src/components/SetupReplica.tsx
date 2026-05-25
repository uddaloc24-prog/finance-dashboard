// SetupReplica — faithful React port of the "Step 1 of 5 · Profile setup"
// screen from RetireWise_Psychometric_Assessment_Tool_v10_Adaptive.html.
// Same 7 sections, same 33 fields, same copy. Auto-saves to localStorage
// under `rp_psych_setup` on every change so partial input survives any
// close-and-return cycle (matches the rest of the app's persistence model).

import { useEffect, useMemo, useState } from 'react'

type OptList = ReadonlyArray<readonly [string, string]>

// ─── Field shape + defaults ────────────────────────────────────────────

interface SetupData {
  // Identity (3)
  name: string; age: string; gender: string
  // Background (4)
  city: string; region: string; language: string; upbringing: string
  // Profession & resources (4)
  industry: string; education: string; income: string; primaryEarner: string
  // Family & life stage (5)
  parentsSupport: string; spouseWorking: string; marital: string; children: string; stage: string
  // Geography & origin (6)
  birthPlace: string; residenceCity: string; workCity: string; nriStatus: string; religion: string; ethnicity: string
  // Work specifics (4)
  workType: string; employerType: string; yearsExp: string; jobStability: string
  // Financial baseline (7)
  monthlyTakeHome: string; savingsRate: string; liabilitiesBand: string; hasHomeLoan: string; investExp: string; goalHorizon: string; primaryGoal: string
}

const DEFAULT: SetupData = {
  name: '', age: '', gender: '',
  city: '', region: '', language: '', upbringing: '',
  industry: '', education: '', income: '', primaryEarner: '',
  parentsSupport: '', spouseWorking: '', marital: '', children: '', stage: '',
  birthPlace: '', residenceCity: '', workCity: '', nriStatus: '', religion: '', ethnicity: '',
  workType: '', employerType: '', yearsExp: '', jobStability: '',
  monthlyTakeHome: '', savingsRate: '', liabilitiesBand: '', hasHomeLoan: '', investExp: '', goalHorizon: '', primaryGoal: '',
}

const STORAGE_KEY = 'rp_psych_setup'

function readStored(): SetupData {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) as Partial<SetupData> } : DEFAULT
  } catch { return DEFAULT }
}

// ─── Section metadata ─────────────────────────────────────────────────

const SECTIONS = [
  { id: 'identity',    icon: '🪷', title: 'Identity',                tagline: 'The very basics — required to personalize anything.',                       iconBg: 'linear-gradient(135deg,#ff9933,#ffd180)', iconBorder: '#ff6f00', iconColor: '#7a3a00', fields: ['name', 'age', 'gender'] as const },
  { id: 'background',  icon: '🕉️', title: 'Background',              tagline: 'Region, language, upbringing — context that shapes how we frame questions.', iconBg: 'linear-gradient(135deg,#1a237e,#3949ab)', iconBorder: '#1a237e', iconColor: '#fff',    fields: ['city', 'region', 'language', 'upbringing'] as const },
  { id: 'profession',  icon: '🌾', title: 'Profession & resources',  tagline: 'Industry, education, income — shapes how we calibrate recommendations.',     iconBg: 'linear-gradient(135deg,#2e7d32,#66bb6a)', iconBorder: '#1b5e20', iconColor: '#fff',    fields: ['industry', 'education', 'income', 'primaryEarner'] as const },
  { id: 'family',      icon: '🪔', title: 'Family & life stage',     tagline: 'Family context — drives the spouse / children / horizon adaptations.',       iconBg: 'linear-gradient(135deg,#c2185b,#f06292)', iconBorder: '#880e4f', iconColor: '#fff',    fields: ['parentsSupport', 'spouseWorking', 'marital', 'children', 'stage'] as const },
  { id: 'geography',   icon: '🦚', title: 'Geography & origin',      tagline: 'Where you come from, where you live, where you work — and optional cultural context.', iconBg: 'linear-gradient(135deg,#0277bd,#4fc3f7)', iconBorder: '#01579b', iconColor: '#fff',    fields: ['birthPlace', 'residenceCity', 'workCity', 'nriStatus', 'religion', 'ethnicity'] as const },
  { id: 'work',        icon: '💼', title: 'Work specifics',          tagline: 'Type of work, employer, experience — refines our risk-capacity and UPS / NPS / EPF defaults.', iconBg: 'linear-gradient(135deg,#6a1b9a,#ab47bc)', iconBorder: '#4a148c', iconColor: '#fff',    fields: ['workType', 'employerType', 'yearsExp', 'jobStability'] as const },
  { id: 'baseline',    icon: '🪙', title: 'Financial baseline',      tagline: 'Quick numbers — full breakdown comes later. These pre-fill your financial profile.', iconBg: 'linear-gradient(135deg,#b07d22,#d49a3a)', iconBorder: '#8c6a1d', iconColor: '#fff',    fields: ['monthlyTakeHome', 'savingsRate', 'liabilitiesBand', 'hasHomeLoan', 'investExp', 'goalHorizon', 'primaryGoal'] as const },
] as const

const TOTAL_FIELDS = SECTIONS.reduce((s, sec) => s + sec.fields.length, 0)

// ─── Select-option dictionaries (verbatim from source HTML) ───────────

const OPT_GENDER: OptList = [['male', '♂ Male'], ['female', '♀ Female'], ['non-binary', '⚧ Non-binary / Other'], ['prefer-not', 'Prefer not to say']]
const OPT_CITY: OptList = [['T1', 'Tier 1 (Metro: Mumbai / Delhi / Bangalore / etc.)'], ['T2', 'Tier 2 (Pune / Jaipur / Kochi / etc.)'], ['T3', 'Tier 3 (smaller town)'], ['rural', 'Rural / village']]
const OPT_REGION: OptList = [['north', 'North India'], ['south', 'South India'], ['east', 'East India'], ['northeast', 'Northeast'], ['west', 'West India'], ['central', 'Central India'], ['nri', 'NRI / Diaspora'], ['multi', 'Multi-regional / mixed']]
const OPT_LANGUAGE: OptList = [['hindi', 'Hindi'], ['english', 'English'], ['tamil', 'Tamil'], ['telugu', 'Telugu'], ['bengali', 'Bengali'], ['marathi', 'Marathi'], ['gujarati', 'Gujarati'], ['punjabi', 'Punjabi'], ['kannada', 'Kannada'], ['malayalam', 'Malayalam'], ['urdu', 'Urdu'], ['odia', 'Odia'], ['assamese', 'Assamese'], ['other', 'Other Indian language']]
const OPT_UPBRINGING: OptList = [['urban', 'Urban (metro / large city)'], ['semi-urban', 'Semi-urban (small town)'], ['rural', 'Rural / village'], ['mixed', 'Mixed (moved around)'], ['abroad', 'Grew up abroad']]
const OPT_INDUSTRY: OptList = [['government', 'Government / PSU'], ['defense', 'Defense / Police / Forces'], ['it-services', 'IT / Software'], ['finance', 'Finance / Banking'], ['healthcare', 'Healthcare'], ['education', 'Education / Academia'], ['manufacturing', 'Manufacturing / Engineering'], ['trade-business', 'Trading / Family Business'], ['agriculture', 'Agriculture'], ['professional', 'Professional (CA / Doctor / Lawyer)'], ['self-employed', 'Self-employed / Freelance'], ['homemaker', 'Homemaker'], ['retired', 'Retired'], ['other', 'Other']]
const OPT_EDUCATION: OptList = [['upto-10', 'Up to 10th'], ['12-or-diploma', '12th / Diploma'], ['graduate', 'Graduate'], ['postgraduate', 'Postgraduate / MBA / MSc'], ['professional', 'Professional degree (CA / MD / Law)'], ['doctoral', 'Doctoral / PhD']]
const OPT_INCOME: OptList = [['lt5L', 'Less than ₹5 L'], ['5L-10L', '₹5 L – ₹10 L'], ['10L-25L', '₹10 L – ₹25 L'], ['25L-50L', '₹25 L – ₹50 L'], ['50L-1Cr', '₹50 L – ₹1 Cr'], ['1Cr-3Cr', '₹1 Cr – ₹3 Cr'], ['3Cr+', '₹3 Cr +'], ['prefer-not', 'Prefer not to say']]
const OPT_PRIMARY_EARNER: OptList = [['self', 'Me alone'], ['spouse', 'My spouse alone'], ['joint', 'Both of us (joint)'], ['children', 'Adult children'], ['pension', 'Pension only (retired)'], ['passive', 'Passive income only (rent / dividends)'], ['other', 'Other']]
const OPT_PARENTS: OptList = [['none', 'No parents to support'], ['financial', 'Yes — financial support'], ['healthcare', 'Yes — healthcare needs'], ['both', 'Yes — both financial and healthcare'], ['future', 'Likely in the next 10 years']]
const OPT_SPOUSE: OptList = [['na', 'Not applicable'], ['yes-full', 'Yes — full-time'], ['yes-part', 'Yes — part-time'], ['no', 'No / homemaker'], ['retired', 'Retired']]
const OPT_MARITAL: OptList = [['single', 'Single (never married)'], ['married', 'Married'], ['partner', 'Partnered (unmarried)'], ['engaged', 'Engaged'], ['separated', 'Separated'], ['divorced', 'Divorced'], ['widowed', 'Widowed']]
const OPT_CHILDREN: OptList = [['none', 'None'], ['1-dep', '1 (still dependent)'], ['2-dep', '2 (still dependent)'], ['3plus-dep', '3+ (still dependent)'], ['mix', 'Some dependent, some independent'], ['all-indep', 'All grown / independent'], ['grandchildren', 'Grandchildren in the picture']]
const OPT_STAGE: OptList = [['earning-young', 'Earning < 40'], ['earning-mid', 'Earning 40 – 50'], ['pre-retiree', 'Pre-retiree (50 – 60)'], ['recent-retiree', 'Recent retiree (60 – 70)'], ['senior-retiree', 'Senior retiree (70+)']]
const OPT_NRI: OptList = [['resident', 'Resident Indian'], ['nri', 'NRI (Non-Resident)'], ['rnor', 'RNOR (Resident but Not Ordinarily Resident)'], ['oci', 'OCI / PIO']]
const OPT_RELIGION: OptList = [['hindu', 'Hindu'], ['muslim', 'Muslim'], ['christian', 'Christian'], ['sikh', 'Sikh'], ['buddhist', 'Buddhist'], ['jain', 'Jain'], ['parsi', 'Parsi / Zoroastrian'], ['jewish', 'Jewish'], ['other', 'Other'], ['none', 'None / Secular']]
const OPT_WORK_TYPE: OptList = [['salaried', 'Salaried (regular pay)'], ['self-employed', 'Self-employed / freelance'], ['business-owner', 'Business owner / proprietor'], ['consultant', 'Consultant'], ['govt-central', 'Govt employee (central)'], ['govt-state', 'Govt employee (state)'], ['psu', 'PSU employee'], ['forces', 'Defence / Police / Forces'], ['academic', 'Academic / research'], ['contractor', 'Contractor / gig worker'], ['retired', 'Retired'], ['homemaker', 'Homemaker'], ['student', 'Student']]
const OPT_EMPLOYER: OptList = [['private-indian', 'Private Indian company'], ['mnc', 'MNC / multinational'], ['startup', 'Startup (early-stage)'], ['psu', 'PSU / public-sector'], ['govt', 'Government department'], ['ngo', 'NGO / nonprofit'], ['own-business', 'Own business'], ['none', 'Not applicable']]
const OPT_JOB_STABILITY: OptList = [['stable', 'Stable (regular salary or pension)'], ['moderate', 'Moderate (some variability)'], ['volatile', 'Volatile (cyclical / commission / startup)'], ['seasonal', 'Seasonal']]
const OPT_LIABILITIES: OptList = [['none', 'No loans'], ['lt5L', '< ₹5 L'], ['5L-25L', '₹5 L – ₹25 L'], ['25L-1Cr', '₹25 L – ₹1 Cr'], ['1Cr-5Cr', '₹1 Cr – ₹5 Cr'], ['5Cr+', '> ₹5 Cr'], ['prefer-not', 'Prefer not to say']]
const OPT_HOME_LOAN: OptList = [['yes-sbi-maxgain', 'Yes — SBI MaxGain / overdraft'], ['yes-regular', 'Yes — regular home loan'], ['no', 'No']]

// ─── Field renderer ───────────────────────────────────────────────────

type FieldKey = keyof SetupData
type FieldConfig = { label: string; required?: boolean; optionalNote?: boolean } &
  ({ kind: 'text' | 'number' | 'textarea'; placeholder?: string; min?: number; max?: number; rows?: number } |
   { kind: 'select'; options: OptList })

const FIELDS: Record<FieldKey, FieldConfig> = {
  name:            { kind: 'text',     label: '👋 Name',                                   placeholder: 'e.g. Mrs Iyer',                                                     required: true },
  age:             { kind: 'number',   label: '🎂 Age',                                    placeholder: 'e.g. 58', min: 18, max: 100,                                         required: true },
  gender:          { kind: 'select',   label: '⚧ Gender',                                  options: OPT_GENDER },
  city:            { kind: 'select',   label: '📍 City tier',                              options: OPT_CITY },
  region:          { kind: 'select',   label: '🗺️ Region / community',                     options: OPT_REGION },
  language:        { kind: 'select',   label: '🗣️ Primary language at home',               options: OPT_LANGUAGE },
  upbringing:      { kind: 'select',   label: '🏠 Upbringing',                             options: OPT_UPBRINGING },
  industry:        { kind: 'select',   label: '💼 Industry / occupation',                  options: OPT_INDUSTRY },
  education:       { kind: 'select',   label: '🎓 Education level',                        options: OPT_EDUCATION },
  income:          { kind: 'select',   label: '💰 Annual household income',                options: OPT_INCOME },
  primaryEarner:   { kind: 'select',   label: '💵 Primary income earner',                  options: OPT_PRIMARY_EARNER },
  parentsSupport:  { kind: 'select',   label: '👴 Aging parents to support?',              options: OPT_PARENTS },
  spouseWorking:   { kind: 'select',   label: '👫 Spouse working?',                        options: OPT_SPOUSE },
  marital:         { kind: 'select',   label: '💍 Marital status',                         options: OPT_MARITAL },
  children:        { kind: 'select',   label: '👶 Children',                               options: OPT_CHILDREN },
  stage:           { kind: 'select',   label: '🌅 Life stage',                             options: OPT_STAGE },
  birthPlace:      { kind: 'text',     label: '🏛️ Place of birth (state)',                placeholder: 'e.g. Tamil Nadu' },
  residenceCity:   { kind: 'text',     label: '🏙️ Current city of residence',             placeholder: 'e.g. Bengaluru' },
  workCity:        { kind: 'text',     label: '🏢 Place of work (city)',                   placeholder: 'e.g. same as residence' },
  nriStatus:       { kind: 'select',   label: '✈️ NRI status',                             options: OPT_NRI },
  religion:        { kind: 'select',   label: '🕊️ Religious / cultural background',       options: OPT_RELIGION, optionalNote: true },
  ethnicity:       { kind: 'text',     label: '🧬 Community / ethnicity',                  placeholder: 'e.g. Marwari, Bengali, Tamil Brahmin, Punjabi', optionalNote: true },
  workType:        { kind: 'select',   label: '📋 Type of work',                           options: OPT_WORK_TYPE },
  employerType:    { kind: 'select',   label: '🏛️ Employer type',                          options: OPT_EMPLOYER },
  yearsExp:        { kind: 'number',   label: '⏱️ Years of work experience',               placeholder: 'e.g. 12', min: 0, max: 60 },
  jobStability:    { kind: 'select',   label: '📊 Job / income stability',                 options: OPT_JOB_STABILITY },
  monthlyTakeHome: { kind: 'number',   label: '💵 Monthly take-home (₹)',                  placeholder: 'e.g. 150000', min: 0 },
  savingsRate:     { kind: 'number',   label: '💰 Savings rate (%)',                       placeholder: 'e.g. 25', min: 0, max: 100 },
  liabilitiesBand: { kind: 'select',   label: '💳 Total liabilities (band)',               options: OPT_LIABILITIES },
  hasHomeLoan:     { kind: 'select',   label: '🏠 Have a home loan?',                      options: OPT_HOME_LOAN },
  investExp:       { kind: 'number',   label: '📚 Investment experience (years)',          placeholder: 'e.g. 8', min: 0, max: 60 },
  goalHorizon:     { kind: 'number',   label: '🎯 Goal horizon (years)',                   placeholder: 'e.g. 15', min: 0, max: 50 },
  primaryGoal:     { kind: 'textarea', label: '⭐ Your primary financial goal — in your own words', placeholder: 'e.g. Retire by 55 with ₹5 Cr corpus and support my parents through their health needs', rows: 2 },
}

// ─── Component ────────────────────────────────────────────────────────

export function SetupReplica() {
  const [data, setData] = useState<SetupData>(() => readStored())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  }, [data])

  const completion = useMemo(() => {
    const filled = (Object.keys(data) as FieldKey[]).filter((k) => String(data[k]).trim() !== '').length
    return { filled, pct: Math.round((filled / TOTAL_FIELDS) * 100) }
  }, [data])

  function setField<K extends FieldKey>(key: K, value: SetupData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  function reset() {
    if (typeof window === 'undefined') return
    if (!window.confirm('Reset all setup fields? Auto-saved values will be cleared.')) return
    setData(DEFAULT)
  }

  return (
    <section className="mt-12">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200 p-5 sm:p-6 mb-4">
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">Step 1 of 5 · Profile setup</div>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 leading-tight">
          नमस्ते — let's get to know you
        </h2>
        <p className="text-[13px] text-slate-700 mt-2 max-w-2xl leading-snug">
          A few details to tune everything to <em className="not-italic font-bold">your</em> context — language, region, life stage, household, work, goals.{' '}
          <strong>Nothing leaves your browser.</strong> A 5-minute pause that shapes the next 30 years.
        </p>
        {/* Progress meter */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden border border-amber-200">
            <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700 transition-all" style={{ width: `${completion.pct}%` }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-amber-800 shrink-0">
            {completion.filled === 0 ? `Just getting started — ${TOTAL_FIELDS} fields total` : `${completion.filled}/${TOTAL_FIELDS} · ${completion.pct}%`}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((sec) => (
          <SetupSection key={sec.id} sec={sec} data={data} onChange={setField} />
        ))}
      </div>

      {/* Profile preview */}
      <ProfilePreview data={data} />

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] text-emerald-700 font-semibold">🔒 Auto-saved · stays in your browser</span>
        <button
          type="button"
          onClick={reset}
          className="text-[10px] font-bold uppercase tracking-[2px] text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded px-2 py-1 transition-colors"
        >
          Reset all fields
        </button>
      </div>

      {/* Source attribution */}
      <p className="text-[10px] text-slate-500 italic mt-2 pt-2 border-t border-slate-200">
        Replica of <code className="font-mono text-slate-700">Claude/Projects/Financial Planning/RetireWise_Psychometric_Assessment_Tool_v10_Adaptive.html</code> § "Step 1 of 5 · Profile setup". 33 fields, 7 sections.
      </p>
    </section>
  )
}

// ─── Section sub-component ────────────────────────────────────────────

type Section = (typeof SECTIONS)[number]

function SetupSection({ sec, data, onChange }: { sec: Section; data: SetupData; onChange: <K extends FieldKey>(k: K, v: SetupData[K]) => void }) {
  const filled = sec.fields.filter((k) => String(data[k as FieldKey]).trim() !== '').length
  const total = sec.fields.length
  const cols = sec.id === 'family' || sec.id === 'identity' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'

  return (
    <section className="rounded-lg border-2 border-slate-200 bg-white p-4">
      <header className="flex items-center gap-3 mb-3">
        <span
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl border-2 shrink-0"
          style={{ background: sec.iconBg, borderColor: sec.iconBorder, color: sec.iconColor }}
        >
          {sec.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{sec.title}</h3>
          <p className="text-[11.5px] text-slate-600 leading-snug mt-0.5">{sec.tagline}</p>
        </div>
        <span className={`text-[11px] font-bold tabular-nums rounded-full px-2.5 py-0.5 ${filled === total ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {filled}/{total}
        </span>
      </header>
      <div className={`grid grid-cols-1 ${cols} gap-3`}>
        {sec.fields.map((k) => <FieldInput key={k} k={k as FieldKey} value={data[k as FieldKey]} onChange={(v) => onChange(k as FieldKey, v)} />)}
      </div>
      {sec.id === 'geography' && (
        <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-700 leading-snug">
          <strong className="text-slate-900">🔒 Why we ask — and why these are optional.</strong>{' '}
          Religion, community and ethnicity help us tailor relevant items (HUF tax planning for Hindus, succession rules under Muslim Personal Law, Sukanya Samriddhi for girl children, etc.).
          Both fields default to <em>prefer not to say</em>. All data stays in your browser tab.
        </div>
      )}
    </section>
  )
}

// ─── Single field ─────────────────────────────────────────────────────

function FieldInput({ k, value, onChange }: { k: FieldKey; value: string; onChange: (v: string) => void }) {
  const cfg = FIELDS[k]
  const baseCls = 'w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 placeholder:text-slate-400'
  const labelCls = 'block text-[12px] font-semibold text-slate-700 mb-1'
  const isFull = k === 'primaryGoal'

  const labelEl = (
    <span className={labelCls}>
      {cfg.label}
      {cfg.required && <span className="text-rose-500 ml-0.5">*</span>}
      {cfg.optionalNote && <span className="text-[10px] text-slate-500 font-normal ml-1">(optional)</span>}
    </span>
  )

  return (
    <label className={`block ${isFull ? 'sm:col-span-3 lg:col-span-2' : ''}`}>
      {labelEl}
      {cfg.kind === 'text' && (
        <input type="text" value={value} placeholder={cfg.placeholder} onChange={(e) => onChange(e.target.value)} className={baseCls} />
      )}
      {cfg.kind === 'number' && (
        <input type="number" value={value} placeholder={cfg.placeholder} min={cfg.min} max={cfg.max} onChange={(e) => onChange(e.target.value)} className={baseCls} />
      )}
      {cfg.kind === 'textarea' && (
        <textarea rows={cfg.rows ?? 2} value={value} placeholder={cfg.placeholder} onChange={(e) => onChange(e.target.value)} className={`${baseCls} resize-y`} />
      )}
      {cfg.kind === 'select' && (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={baseCls}>
          <option value="">— Select —</option>
          {cfg.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      )}
    </label>
  )
}

// ─── Profile preview ──────────────────────────────────────────────────

function ProfilePreview({ data }: { data: SetupData }) {
  // Pull human-readable values from key fields for an at-a-glance summary.
  const chips: Array<{ label: string; value: string }> = []
  if (data.name)           chips.push({ label: 'Name',     value: data.name })
  if (data.age)            chips.push({ label: 'Age',      value: data.age })
  if (data.stage)          chips.push({ label: 'Stage',    value: optLabel(OPT_STAGE, data.stage) })
  if (data.city)           chips.push({ label: 'City',     value: optLabel(OPT_CITY, data.city) })
  if (data.marital)        chips.push({ label: 'Marital',  value: optLabel(OPT_MARITAL, data.marital) })
  if (data.children)       chips.push({ label: 'Children', value: optLabel(OPT_CHILDREN, data.children) })
  if (data.workType)       chips.push({ label: 'Work',     value: optLabel(OPT_WORK_TYPE, data.workType) })
  if (data.income)         chips.push({ label: 'Income',   value: optLabel(OPT_INCOME, data.income) })
  if (data.monthlyTakeHome) chips.push({ label: 'Take-home', value: `₹${data.monthlyTakeHome}/mo` })
  if (data.savingsRate)    chips.push({ label: 'Savings rate', value: `${data.savingsRate}%` })

  return (
    <section className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl">🌟</span>
        <h3 className="font-serif text-base font-extrabold text-slate-900">Your profile so far</h3>
        <span className="text-[10px] text-slate-500 italic">updates as you fill in</span>
      </div>
      {chips.length === 0 ? (
        <p className="text-[12px] text-slate-500 italic">Fill in some details above to see your profile take shape…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-baseline gap-1.5 text-[11px] bg-white border border-amber-200 rounded-full px-2.5 py-1">
              <span className="font-bold text-amber-800 uppercase tracking-wider text-[9px]">{c.label}</span>
              <span className="text-slate-800">{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function optLabel(options: OptList, value: string): string {
  return options.find(([v]) => v === value)?.[1] ?? value
}
