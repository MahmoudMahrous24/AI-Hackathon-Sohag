import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import type { AnalysisData } from '../../types/chat'

export function AnalysisReport({ analysis }: { analysis: AnalysisData }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">
          {t.chat.analysisEyebrow}
        </p>
        <p className="font-mono text-sm text-teal">{analysis.confidence}%</p>
      </div>

      <h3 className="font-display text-2xl font-medium leading-snug text-text-primary">
        {analysis.condition}
      </h3>

      <div className="h-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className="confidence-bar h-full rounded-full bg-teal"
          style={{ width: `${analysis.confidence}%` }}
        />
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          {t.chat.observedCharacteristics}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {analysis.characteristics.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-center text-xs text-text-secondary"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-7 text-text-secondary">{analysis.explanation}</p>

      <div
        className="flex gap-3 rounded-xl px-4 py-3"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
        }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-xs leading-6 text-text-secondary">{t.chat.disclaimer}</p>
      </div>
    </div>
  )
}
