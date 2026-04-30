import type { ReactNode } from 'react'

interface BubbleProps {
  role: 'ai' | 'user'
  children: ReactNode
  timestamp?: string
}

export function Bubble({ role, children, timestamp }: BubbleProps) {
  const isAI = role === 'ai'
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isAI
              ? 'bg-white text-gray-800 border border-gray-200'
              : 'bg-blue-600 text-white'
          }`}
        >
          {children}
        </div>
        {timestamp && (
          <div className={`mt-1 text-[10px] text-gray-400 ${isAI ? 'text-left' : 'text-right'}`}>
            {new Date(timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  )
}
