// Minimal Markdown → React renderer. Covers the subset used in the
// tasks/*.md docs: ATX headings, paragraphs, bullets / ordered lists /
// task lists, fenced code, inline code/bold/links, `---` horizontal
// rule, pipe tables. Not a general-purpose CommonMark parser.

import type { ReactNode } from 'react'

interface Props { source: string }

export function MarkdownView({ source }: Props) {
  const blocks = splitBlocks(source)
  return (
    <article className="prose prose-slate max-w-none text-[13.5px] leading-relaxed text-slate-800">
      {blocks.map((b, i) => renderBlock(b, i))}
    </article>
  )
}

// ─── Block splitting ───────────────────────────────────────────────────

interface Block { kind: string; lines: string[] }

function splitBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    if (ln.trim() === '') { i++; continue }
    if (/^---+$/.test(ln.trim())) { out.push({ kind: 'hr', lines: [] }); i++; continue }
    if (/^#{1,6}\s/.test(ln))    { out.push({ kind: 'heading', lines: [ln] }); i++; continue }
    if (/^```/.test(ln)) {
      const j = lines.findIndex((l, k) => k > i && /^```/.test(l))
      const end = j === -1 ? lines.length : j
      out.push({ kind: 'code', lines: lines.slice(i + 1, end) })
      i = end + 1; continue
    }
    if (/^\|.+\|/.test(ln)) {
      const block: string[] = []
      while (i < lines.length && /^\|.+\|/.test(lines[i])) { block.push(lines[i]); i++ }
      out.push({ kind: 'table', lines: block }); continue
    }
    if (/^\s*[-*]\s/.test(ln) || /^\s*\d+\.\s/.test(ln)) {
      const block: string[] = []
      const ordered = /^\s*\d+\.\s/.test(ln)
      while (i < lines.length &&
             (ordered ? /^\s*\d+\.\s/.test(lines[i]) : /^\s*[-*]\s/.test(lines[i]))) {
        block.push(lines[i]); i++
      }
      out.push({ kind: ordered ? 'ol' : 'ul', lines: block }); continue
    }
    // paragraph — until blank line or block-start
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^#{1,6}\s/.test(lines[i]) && !/^---+$/.test(lines[i].trim()) &&
           !/^```/.test(lines[i]) && !/^\|.+\|/.test(lines[i]) &&
           !/^\s*[-*]\s/.test(lines[i]) && !/^\s*\d+\.\s/.test(lines[i])) {
      para.push(lines[i]); i++
    }
    out.push({ kind: 'p', lines: para })
  }
  return out
}

// ─── Block rendering ───────────────────────────────────────────────────

function renderBlock(b: Block, k: number): ReactNode {
  switch (b.kind) {
    case 'hr':
      return <hr key={k} className="my-4 border-slate-200" />
    case 'heading': {
      const m = b.lines[0].match(/^(#{1,6})\s+(.*)$/)
      const level = m ? m[1].length : 1
      const text = m ? m[2] : b.lines[0]
      const Tag = (`h${Math.min(level, 6)}` as 'h1')
      const cls =
        level === 1 ? 'font-serif text-2xl font-extrabold text-slate-900 mt-6 mb-2 first:mt-0' :
        level === 2 ? 'font-serif text-xl  font-extrabold text-slate-900 mt-6 mb-2 border-b border-slate-200 pb-1' :
        level === 3 ? 'font-serif text-base font-extrabold text-slate-900 mt-4 mb-1.5' :
                      'font-bold text-[14px] text-slate-900 mt-3 mb-1'
      return <Tag key={k} className={cls}>{inline(text)}</Tag>
    }
    case 'p':
      return <p key={k} className="my-2 leading-relaxed">{inline(b.lines.join(' '))}</p>
    case 'code':
      return <pre key={k} className="my-3 bg-slate-900 text-slate-100 text-[12px] rounded-md p-3 overflow-x-auto"><code>{b.lines.join('\n')}</code></pre>
    case 'ul':
    case 'ol': {
      const Tag = (b.kind === 'ol' ? 'ol' : 'ul') as 'ul'
      const cls = b.kind === 'ol' ? 'list-decimal pl-6 my-2 space-y-1' : 'list-disc pl-6 my-2 space-y-1'
      return (
        <Tag key={k} className={cls}>
          {b.lines.map((ln, j) => {
            const txt = ln.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
            const tick = txt.match(/^\[([ xX])\]\s+(.*)$/)
            if (tick) {
              return (
                <li key={j} className="list-none -ml-6 flex items-start gap-2">
                  <span className={`inline-flex items-center justify-center w-4 h-4 mt-0.5 rounded border-2 ${tick[1].toLowerCase() === 'x' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-400'}`}>
                    {tick[1].toLowerCase() === 'x' && <span className="text-[10px] leading-none font-bold">✓</span>}
                  </span>
                  <span className={tick[1].toLowerCase() === 'x' ? 'line-through text-slate-500' : ''}>{inline(tick[2])}</span>
                </li>
              )
            }
            return <li key={j}>{inline(txt)}</li>
          })}
        </Tag>
      )
    }
    case 'table': {
      const rows = b.lines
        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
      // Drop the alignment row (--- :--- ---:)
      const data = rows.filter((r) => !r.every((c) => /^:?-+:?$/.test(c)))
      if (data.length === 0) return null
      const [head, ...body] = data
      return (
        <div key={k} className="my-3 overflow-x-auto rounded-md border-2 border-slate-200">
          <table className="w-full text-[12.5px] border-collapse">
            <thead className="bg-slate-100">
              <tr>{head.map((c, j) => <th key={j} className="text-left font-bold text-slate-700 px-2.5 py-1.5 border-b border-slate-200">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j} className="even:bg-slate-50/60 align-top">
                  {r.map((c, m) => <td key={m} className="px-2.5 py-1.5 border-b border-slate-100">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    default:
      return null
  }
}

// ─── Inline rendering — bold, code, links, line breaks ────────────────

function inline(text: string): ReactNode {
  // Pattern order matters: code before bold so `**` inside backticks stays literal.
  const parts: ReactNode[] = []
  let i = 0
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index))
    const tok = m[0]
    if (tok.startsWith('`')) {
      parts.push(<code key={key++} className="bg-slate-100 text-rose-700 px-1 py-0.5 rounded text-[12px] font-mono">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key++} className="font-bold text-slate-900">{tok.slice(2, -2)}</strong>)
    } else {
      const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) parts.push(<a key={key++} href={linkMatch[2]} className="text-blue-700 underline hover:text-blue-900" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>)
    }
    i = m.index + tok.length
  }
  if (i < text.length) parts.push(text.slice(i))
  return <>{parts}</>
}
