import { TAB_ITEMS, type TabId } from '../constants'

interface Props {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  plan: 'Enter your corpus, demographics, and expense profile',
  profiles: 'Take the risk quiz, see all 5 profiles side by side',
  strategies: 'Compare 10 retirement strategies against your corpus',
  assets: 'Review and adjust your bucket allocation',
  explorer: 'Browse asset classes per bucket — pick a class then a specific fund/instrument',
  simulate: 'Stress-test the plan with Monte Carlo and year-by-year sims',
  tax: 'Indian tax breakdown, LTCG optimizer, and reshuffle advice',
  insights: 'The full editorial report — verdict, all sections, take-home, and download',
  ai: 'AI-powered fund picks based on your profile and live market data',
}

export function TabNavFooter({ activeTab, onChange }: Props) {
  const idx = TAB_ITEMS.findIndex((t) => t.id === activeTab)
  const prev = idx > 0 ? TAB_ITEMS[idx - 1] : null
  const next = idx < TAB_ITEMS.length - 1 ? TAB_ITEMS[idx + 1] : null

  return (
    <nav
      aria-label="Step navigation"
      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-stretch gap-3 mt-2"
    >
      <NavButton
        direction="prev"
        item={prev}
        description={prev ? TAB_DESCRIPTIONS[prev.id] : null}
        onClick={() => prev && onChange(prev.id)}
      />
      <div className="hidden sm:flex flex-col items-center justify-center px-3 min-w-0 shrink-0">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Step</div>
        <div className="text-base font-semibold text-slate-700 tabular-nums">
          {idx + 1} / {TAB_ITEMS.length}
        </div>
      </div>
      <NavButton
        direction="next"
        item={next}
        description={next ? TAB_DESCRIPTIONS[next.id] : null}
        onClick={() => next && onChange(next.id)}
      />
    </nav>
  )
}

function NavButton({
  direction,
  item,
  description,
  onClick,
}: {
  direction: 'prev' | 'next'
  item: { id: TabId; label: string; icon: string } | null
  description: string | null
  onClick: () => void
}) {
  if (!item) {
    return (
      <div
        className={`flex-1 min-w-0 rounded-lg border border-dashed border-slate-200 px-3 py-2 flex flex-col justify-center ${
          direction === 'prev' ? 'items-start' : 'items-end'
        }`}
      >
        <div className="text-[10px] text-slate-400 uppercase tracking-wide">
          {direction === 'prev' ? 'Start' : 'End'}
        </div>
        <div className="text-xs text-slate-400">
          {direction === 'prev' ? 'Welcome page' : 'You are at the last step'}
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left ${
        direction === 'next' ? 'sm:text-right' : ''
      }`}
    >
      <div className={`text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1 ${direction === 'next' ? 'sm:justify-end' : ''}`}>
        {direction === 'prev' && <span aria-hidden="true">←</span>}
        <span>{direction === 'prev' ? 'Previous' : 'Next'}</span>
        {direction === 'next' && <span aria-hidden="true">→</span>}
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
        {item.label}
      </div>
      {description && (
        <div className="text-[11px] text-slate-500 mt-0.5 hidden sm:block leading-tight line-clamp-2">
          {description}
        </div>
      )}
    </button>
  )
}
