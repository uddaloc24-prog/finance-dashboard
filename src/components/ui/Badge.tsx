interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'amber' | 'green' | 'gray' | 'red'
}

const variants = {
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-red-700',
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
