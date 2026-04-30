import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '../ui/Button'

interface AnswerFormProps {
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function AnswerForm({ onSubmit, disabled, placeholder }: AnswerFormProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
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

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white p-3 flex gap-2 items-end"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? 'Type your answer...'}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 max-h-32"
        aria-label="Your answer"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Send
      </Button>
    </form>
  )
}
