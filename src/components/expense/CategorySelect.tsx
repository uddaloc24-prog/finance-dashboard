// CategorySelect — shared dropdown that renders parents as <optgroup>s
// and only allows leaf categories to be picked. Used by both the
// structured add-transaction form and the inline category edit on each
// row of the transactions list.

import type { Category } from '../../types/expense'

interface Props {
  categories: Category[]
  value: string                              // '' = uncategorised
  onChange: (categoryId: string) => void
  className?: string
  /** Show the "uncategorised" placeholder option. */
  allowEmpty?: boolean
  emptyLabel?: string
  ariaLabel?: string
}

export function CategorySelect({
  categories, value, onChange, className, allowEmpty = true, emptyLabel, ariaLabel,
}: Props) {
  const parents = categories
    .filter((c) => c.parentId === null && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={className}
    >
      {allowEmpty && (
        <option value="">{emptyLabel ?? '— uncategorised (needs review) —'}</option>
      )}
      {parents.map((p) => {
        const children = categories
          .filter((c) => c.parentId === p.id && c.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        if (children.length === 0) {
          return <option key={p.id} value={p.id}>{p.name}</option>
        }
        return (
          <optgroup key={p.id} label={p.name}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
