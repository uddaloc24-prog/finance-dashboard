import { TAB_ITEMS, type TabId } from '../constants'

interface Props {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function TabNav({ activeTab, onChange }: Props) {
  return (
    <>
      {/* Desktop: flat underline tabs — integrates with sticky header */}
      <nav aria-label="Main navigation" className="hidden md:block">
        <div role="tablist" aria-label="Dashboard sections" className="flex gap-0.5">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="text-sm" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav aria-label="Main navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
        <div role="tablist" aria-label="Dashboard sections" className="flex justify-around">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-mobile-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 min-h-[56px] min-w-[56px] px-2 py-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
