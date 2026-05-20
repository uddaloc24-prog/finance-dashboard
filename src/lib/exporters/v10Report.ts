// Shared v10 / Goal Discovery report-data assembler. Each exporter
// (PDF / DOCX / PPTX / Markdown / CSV) renders these sections in its
// own format. Returns an empty array when neither the GD inference nor
// v10 composites are available, so exporters can skip the section
// cleanly.

import { storage } from '../storage'
import type { SignalId } from '../../types/psychometric'

const SIGNAL_LABEL: Record<SignalId, string> = {
  money_script_avoidance:    'Money Avoidance',
  money_script_worship:      'Money Worship',
  money_script_status:       'Money Status',
  money_script_vigilance:    'Money Vigilance',
  time_orientation_present:  'Present-biased Time Orientation',
  locus_of_control_internal: 'Internal Locus of Control',
  self_efficacy:             'High Self-Efficacy',
  family_obligation_weight:  'Family Obligation Weight',
  protection_to_aspiration:  'Protection ↔ Aspiration',
  financial_anxiety_marker:  'Financial Anxiety Marker',
  herding_susceptibility:    'Herd-Susceptibility',
  overconfidence_marker:     'Overconfidence Marker',
}

export interface V10ReportSection {
  heading: string
  /** label-value rows; the renderer decides how to lay them out */
  rows: Array<[string, string]>
  /** free-form notes printed as a paragraph after the rows */
  notes?: string[]
}

export function getV10ReportSections(): V10ReportSection[] {
  const gd = storage.getGoalDiscovery()
  const v10 = storage.getV10QuizState()
  const inference = gd?.inference ?? null
  const composites = v10?.composites ?? null
  if (!inference && !composites) return []

  const sections: V10ReportSection[] = []

  // ── Persona ──────────────────────────────────────────────────────────
  if (inference?.persona.primary) {
    sections.push({
      heading: 'Inferred persona',
      rows: [
        ['Primary',    inference.persona.primary.name],
        ['Confidence', inference.persona.confidence],
        ['Secondary',  inference.persona.secondary?.name ?? '—'],
      ],
      notes: inference.persona.primary.evidence.length
        ? [`Evidence: ${inference.persona.primary.evidence.slice(0, 5).join(' · ')}`]
        : undefined,
    })
  }

  // ── Composites ───────────────────────────────────────────────────────
  if (composites) {
    sections.push({
      heading: 'v10 composite scores (0–100)',
      rows: [
        ['Risk Profile',          String(Math.round(composites.riskProfile))],
        ['Risk Appetite',         String(Math.round(composites.riskAppetite))],
        ['Risk Capacity',         String(Math.round(composites.riskCapacity))],
        ['Bias Index',            String(Math.round(composites.biasIndex))],
        ['Planning Readiness',    String(Math.round(composites.planningReadiness))],
        ['Scam Vulnerability',    String(Math.round(composites.scamVulnerability))],
        ['Acquiescence Index',    composites.acquiescenceIndex == null ? '—' : String(Math.round(composites.acquiescenceIndex))],
        ['Dominant Money Script', composites.dominantMoneyScript ?? '—'],
      ],
    })
  }

  // ── Active signals ───────────────────────────────────────────────────
  if (inference) {
    const active = (Object.entries(inference.signals)
      .filter(([, sig]) => sig.score != null && sig.score >= 0.7)
      .map(([id, sig]) => [
        SIGNAL_LABEL[id as SignalId],
        sig.evidence[0] ?? '',
      ] as [string, string])
    )
    if (active.length) {
      sections.push({
        heading: 'Active behavioural signals (score ≥ 0.7)',
        rows: active,
      })
    }
  }

  // ── Partner divergence ───────────────────────────────────────────────
  if (inference?.partnerDivergence) {
    const d = inference.partnerDivergence
    sections.push({
      heading: d.diverged ? 'Partner alignment — DIVERGENT' : 'Partner alignment — aligned',
      rows: [
        ['User would drop',    d.userPick],
        ['Partner would drop', d.partnerPick],
        ['Diverged',           d.diverged ? 'YES' : 'NO'],
      ],
      notes: d.diverged
        ? ['Misalignment on the lowest-priority goal often hides misalignment on the top ones. Worth a conversation before the plan locks in.']
        : undefined,
    })
  }

  // ── Bridge sentence ──────────────────────────────────────────────────
  if (inference?.bridgeSentence) {
    sections.push({
      heading: 'Bridge sentence (from Goal Discovery)',
      rows: [],
      notes: [inference.bridgeSentence],
    })
  }

  return sections
}

// ─── Format-specific helpers ────────────────────────────────────────────

export function v10MarkdownBlock(): string {
  const sections = getV10ReportSections()
  if (sections.length === 0) return ''
  const out: string[] = ['', '## Behavioural Assessment (v10)', '']
  for (const s of sections) {
    out.push(`### ${s.heading}`, '')
    if (s.rows.length > 0) {
      out.push('| Field | Value |')
      out.push('| --- | --- |')
      for (const [k, v] of s.rows) out.push(`| ${k} | ${v.replace(/\|/g, '/')} |`)
      out.push('')
    }
    if (s.notes) {
      for (const n of s.notes) out.push(`> ${n}`, '')
    }
  }
  return out.join('\n')
}

export function v10CsvBlock(): string {
  const sections = getV10ReportSections()
  if (sections.length === 0) return ''
  const lines: string[] = []
  lines.push('')
  lines.push('"v10 Behavioural Assessment"')
  for (const s of sections) {
    lines.push('')
    lines.push(`"${s.heading}"`)
    for (const [k, v] of s.rows) {
      lines.push(`"${k}","${v.replace(/"/g, '""')}"`)
    }
    if (s.notes) {
      for (const n of s.notes) lines.push(`"note","${n.replace(/"/g, '""')}"`)
    }
  }
  return lines.join('\n')
}
