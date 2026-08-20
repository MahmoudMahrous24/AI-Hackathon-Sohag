import { ChevronRight } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

export function FinalCta() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-teal-glow-strong),transparent_68%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">{t.cta.eyebrow}</p>
        <h2 className="mt-4 font-display text-3xl text-text-primary md:text-5xl">{t.cta.heading}</h2>
        <p className="mt-4 text-base text-text-secondary">{t.cta.subhead}</p>
        <button
          type="button"
          onClick={() =>
            document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-canvas transition hover:bg-teal-dim"
        >
          {t.cta.button}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </section>
  )
}
