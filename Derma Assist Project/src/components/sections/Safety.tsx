import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

export function Safety() {
  const { t } = useLanguage()

  return (
    <section id="safety" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <ShieldCheck className="h-6 w-6 text-warning" />
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-warning">
          {t.safety.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl text-text-primary md:text-4xl">
          {t.safety.heading}
        </h2>
        <p className="mt-5 text-base leading-8 text-text-secondary">{t.safety.body}</p>
      </div>
    </section>
  )
}
