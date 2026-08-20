import { Microscope, Sparkles, Stethoscope } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

interface EmptyStateProps {
  onSend?: (text: string) => void
  onUpload?: () => void
  isDoctor?: boolean
}

export function EmptyState({ isDoctor = false }: EmptyStateProps) {
  const { t } = useLanguage()

  const heading = isDoctor ? t.chat.doctorEmptyHeading : t.chat.emptyHeading
  const description = isDoctor ? t.chat.doctorEmptyDescription : t.chat.emptyDescription

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center animate-fade-in my-auto py-12">
      <div className={`flex h-16 w-16 items-center justify-center rounded-3xl border shadow-lg ${
        isDoctor ? 'border-purple-500/30 bg-purple-950/20 text-purple-400' : 'border-teal/30 bg-teal/10 text-teal'
      }`}>
        {isDoctor ? <Stethoscope className="h-8 w-8" /> : <Microscope className="h-8 w-8" />}
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold text-text-primary flex items-center gap-2">
        <span>{heading}</span>
        <Sparkles className="h-4 w-4 text-teal opacity-80" />
      </h3>
      <p className="mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  )
}
