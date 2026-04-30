import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

interface AnswerFormProps {
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function AnswerForm({ onSubmit, disabled, placeholder }: AnswerFormProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submit()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-gray-200 bg-white p-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex gap-2 items-end">
        <div className="flex-1 rounded-2xl border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              autoResize(e.target)
            }}
            onKeyDown={handleKey}
            placeholder={placeholder ?? 'Type your answer…'}
            disabled={disabled}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 py-2.5 text-sm leading-relaxed outline-none disabled:text-gray-400 placeholder:text-gray-400"
            aria-label="Your answer"
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M3.105 3.105a.75.75 0 01.815-.165l13.5 5.625a.75.75 0 010 1.385l-13.5 5.625a.75.75 0 01-1.04-.872l1.5-4.5L9 10 4.38 7.997l-1.5-4.5a.75.75 0 01.225-.392z" />
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-gray-400 mt-1.5 px-1">
        Enter to send · Shift+Enter for new line
      </div>
    </form>
  )
}
