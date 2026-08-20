export function SuggestionChip({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-surface-2 px-3.5 py-2 text-sm text-text-secondary transition hover:border-teal/40 hover:text-text-primary"
    >
      {label}
    </button>
  )
}
