import { ChatContainer } from './ChatContainer'
import { useLanguage } from '../../i18n/LanguageContext'

export function ChatSection() {
  const { t } = useLanguage()

  return (
    <section id="chat" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">
              {t.chat.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl text-text-primary md:text-4xl">
              {t.chat.heading}
            </h2>
          </div>
          <span className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="pulse-ring absolute inset-0 rounded-full bg-teal" />
              <span className="relative h-2 w-2 rounded-full bg-teal" />
            </span>
            {t.chat.ready}
          </span>
        </div>
        <ChatContainer />
      </div>
    </section>
  )
}
