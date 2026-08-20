import { ArrowRight, BookOpen } from 'lucide-react'
import { educationTopics } from '../../data/educationTopics'
import { useChatContext } from '../../hooks/useChat'
import { useLanguage } from '../../i18n/LanguageContext'

export function EducationTopics() {
  const { t } = useLanguage()
  const { sendMessage } = useChatContext()

  return (
    <section id="education" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-teal" />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">
            {t.education.eyebrow}
          </p>
        </div>
        <h2 className="mt-3 font-display text-3xl text-text-primary md:text-4xl">
          {t.education.heading}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {educationTopics.map((meta, index) => {
            const topic = t.education.topics[index]
            const prevalence = t.education.prevalence[topic.prevalence]
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => {
                  sendMessage(t.education.askPrompt.replace('{condition}', topic.title))
                  document.getElementById('chat')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
                className="rounded-2xl border border-border bg-surface p-6 text-start transition hover:border-border-bright hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    {topic.category}
                  </p>
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary">
                    {prevalence}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl text-text-primary">{topic.title}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{topic.description}</p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm text-teal">
                  {t.education.ask}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
