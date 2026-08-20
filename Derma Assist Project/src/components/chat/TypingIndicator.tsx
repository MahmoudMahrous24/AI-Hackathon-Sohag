import { useLanguage } from '../../i18n/LanguageContext'

export function TypingIndicator({ kind }: { kind: 'text' | 'image' | 'voice' | 'video' }) {
  const { t } = useLanguage()

  const textLabel =
    kind === 'video'
      ? 'جارٍ تحليل مقطع الفيديو السريري...'
      : kind === 'image'
      ? t.chat.analyzing
      : kind === 'voice'
      ? t.voice.listeningText
      : t.chat.thinking

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] rounded-2xl rounded-ss-lg border border-border bg-surface-2 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal [animation-delay:-0.24s]" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal [animation-delay:-0.12s]" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-teal" />
          </span>
          <span className="text-sm text-text-secondary">{textLabel}</span>
        </div>
      </div>
    </div>
  )
}
