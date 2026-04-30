export function ThinkingState() {
  return (
    <div className="flex justify-start mb-3" aria-label="AI is thinking">
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
      </div>
    </div>
  )
}
