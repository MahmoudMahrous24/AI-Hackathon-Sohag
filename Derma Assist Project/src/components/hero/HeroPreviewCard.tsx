import { useLanguage } from '../../i18n/LanguageContext'

export function HeroPreviewCard() {
  const { t } = useLanguage()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 28% 22%, #4a342f 0%, transparent 48%),
              radial-gradient(ellipse at 78% 70%, #2f2428 0%, transparent 46%),
              linear-gradient(160deg, #24181a 0%, #161318 42%, #2c211f 100%)
            `,
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(10, 175, 160, 0.28) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(10, 175, 160, 0.28) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />
        <div
          className="scan-line pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-teal to-transparent shadow-[0_0_18px_6px_var(--color-teal-glow-strong)]"
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute start-3 top-3 h-7 w-7 border-s-2 border-t-2 border-teal" aria-hidden="true" />
        <span className="pointer-events-none absolute end-3 top-3 h-7 w-7 border-e-2 border-t-2 border-teal" aria-hidden="true" />
        <span className="pointer-events-none absolute start-3 bottom-3 h-7 w-7 border-s-2 border-b-2 border-teal" aria-hidden="true" />
        <span className="pointer-events-none absolute end-3 bottom-3 h-7 w-7 border-e-2 border-b-2 border-teal" aria-hidden="true" />
        <span className="sr-only">Decorative skin-texture preview with scan overlay</span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            {t.hero.previewEyebrow}
          </p>
          <span className="rounded-full border border-teal/30 bg-teal-glow px-2.5 py-1 font-mono text-[11px] text-teal">
            {t.hero.previewMatch}
          </span>
        </div>
        <p className="font-display text-xl text-text-primary">{t.hero.previewCondition}</p>
        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="confidence-bar h-full rounded-full bg-teal" style={{ width: '78%' }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {t.hero.previewTags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-center text-xs text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
