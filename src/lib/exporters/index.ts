// Multi-format export dispatcher.
//
// Same source data; different serialisations: PDF, DOCX, PPTX, Markdown, CSV.
// Heavy libraries (docx, pptxgenjs, jspdf) are dynamically imported so the
// main bundle stays slim — they only load when the user picks the format.

import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { UserIdentity } from '../../types/identity'

export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'md' | 'csv'

export interface ExportContext {
  identity: UserIdentity | null
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

export interface FormatMeta {
  id: ExportFormat
  label: string
  hint: string
  ext: string
}

export const FORMATS: FormatMeta[] = [
  { id: 'pdf',  label: 'PDF',         hint: 'Bordered, justified, professional layout',     ext: '.pdf' },
  { id: 'docx', label: 'Word (DOCX)', hint: 'Editable Word document',                       ext: '.docx' },
  { id: 'pptx', label: 'PowerPoint',  hint: 'Slide deck — one per section',                 ext: '.pptx' },
  { id: 'md',   label: 'Markdown',    hint: 'Plain-text source for git / wikis',            ext: '.md' },
  { id: 'csv',  label: 'CSV / Excel', hint: 'Tabular data — open in Excel or Google Sheets', ext: '.csv' },
]

export async function exportReport(format: ExportFormat, ctx: ExportContext): Promise<void> {
  switch (format) {
    case 'pdf': {
      const { exportComprehensiveReport } = await import('../comprehensiveReport')
      return exportComprehensiveReport(ctx)
    }
    case 'docx': {
      const { exportDocx } = await import('./docx')
      return exportDocx(ctx)
    }
    case 'pptx': {
      const { exportPptx } = await import('./pptx')
      return exportPptx(ctx)
    }
    case 'md': {
      const { exportMarkdown } = await import('./markdown')
      return exportMarkdown(ctx)
    }
    case 'csv': {
      const { exportCsv } = await import('./csv')
      return exportCsv(ctx)
    }
  }
}
