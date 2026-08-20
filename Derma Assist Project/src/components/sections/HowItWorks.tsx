import { howItWorksSteps } from '../../data/howItWorksSteps'
import { useLanguage } from '../../i18n/LanguageContext'

export function HowItWorks() {
  const { t } = useLanguage()

  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">
          {t.howItWorks.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl text-text-primary md:text-4xl">
          {t.howItWorks.heading}
        </h2>
        <div className="mt-10 grid gap-px bg-border sm:grid-cols-3">
          {howItWorksSteps.map((step, index) => {
            const Icon = step.icon
            const copy = t.howItWorks.steps[index]
            return (
              <article key={step.id} className="bg-canvas p-8">
                <p className="font-mono text-xs tracking-[0.16em] text-text-muted">{copy.n}</p>
                <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-teal">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl text-text-primary">{copy.title}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{copy.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
