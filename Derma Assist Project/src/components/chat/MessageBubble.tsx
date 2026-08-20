import { AnalysisReport } from './AnalysisReport'
import { useLanguage } from '../../i18n/LanguageContext'
import type { Message, BookReference } from '../../types/chat'
import { Stethoscope, CheckCircle2, Clock, Volume2, BookOpen, Video, Bot, User } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  onOpenBookReference?: (ref: BookReference) => void
}

export function MessageBubble({ message, onOpenBookReference }: MessageBubbleProps) {
  const { t } = useLanguage()
  const isUser = message.role === 'user'

  const effectiveBookRef: BookReference | null = message.bookReference || null

  return (
    <div className={`flex w-full items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {/* Bot Avatar on Left for Assistant */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal border border-teal/30 shadow-sm mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'rounded-ee-xs bg-teal text-canvas font-medium'
            : 'rounded-ss-xs border border-border bg-surface-2 text-text-primary shadow-md'
        }`}
      >
        {/* Attached Photo */}
        {message.image && (
          <div className={`mb-3 overflow-hidden rounded-xl border ${isUser ? 'border-canvas/20 bg-canvas/10' : 'border-border bg-surface-3'}`}>
            <img
              src={message.image}
              alt={t.chat.uploadedImageAlt}
              className="max-h-60 w-full object-contain bg-black/10"
            />
          </div>
        )}

        {/* Attached Video */}
        {message.videoUrl && (
          <div className={`mb-3 overflow-hidden rounded-xl border ${isUser ? 'border-canvas/20 bg-canvas/10' : 'border-border bg-surface-3'}`}>
            <div className="flex items-center gap-1.5 p-2 text-xs font-semibold border-b border-border/40">
              <Video className="h-3.5 w-3.5" />
              <span>مقطع فيديو سريري</span>
            </div>
            <video controls src={message.videoUrl} className="max-h-64 w-full bg-black" />
          </div>
        )}

        {/* Attached Audio Voice Note */}
        {message.audioUrl && (
          <div className={`mb-2 flex items-center gap-2.5 rounded-xl p-2 border ${isUser ? 'bg-canvas/15 border-canvas/20 text-canvas' : 'bg-surface-3 border-teal/30 text-teal'}`}>
            <Volume2 className="h-4 w-4 shrink-0" />
            <audio controls src={message.audioUrl} className="h-8 max-w-full flex-1 outline-none" />
            {message.audioDuration ? (
              <span className="font-mono text-[11px] opacity-80">{message.audioDuration}s</span>
            ) : null}
          </div>
        )}

        {/* Text Message Content */}
        {message.text && (
          <div
            className={`whitespace-pre-wrap text-sm leading-7 ${
              isUser ? 'text-canvas' : 'text-text-secondary space-y-2'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Doctor Consultation Status Card */}
        {message.doctorConsultation && (
          <div className="mt-3 overflow-hidden rounded-xl border border-teal/40 bg-surface-3 p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={message.doctorConsultation.doctorAvatar}
                  alt={message.doctorConsultation.doctorName}
                  className="h-10 w-10 rounded-full object-cover border border-teal/40"
                />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-teal" />
                    {message.doctorConsultation.doctorName}
                  </h4>
                  <p className="text-xs text-text-secondary">{message.doctorConsultation.doctorTitle}</p>
                </div>
              </div>

              {message.doctorConsultation.status === 'pending' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  {t.doctor.statusPending}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success border border-success/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.doctor.statusReplied}
                </span>
              )}
            </div>

            {/* Official Medical Prescription */}
            {message.doctorConsultation.prescription && (
              <div className="space-y-3 rounded-xl border border-teal/30 bg-canvas/70 p-3.5 text-xs shadow-sm">
                <div className="flex items-center justify-between text-teal font-semibold border-b border-teal/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {t.doctor.prescriptionHeader}
                  </span>
                  <span className="rounded bg-teal/15 px-2 py-0.5 text-[10px] text-teal uppercase font-mono font-bold">
                    {message.doctorConsultation.prescription.urgency === 'urgent'
                      ? t.doctor.urgencyUrgent
                      : message.doctorConsultation.prescription.urgency === 'referral'
                      ? t.doctor.urgencyReferral
                      : t.doctor.urgencyRoutine}
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-text-primary mb-1.5">{t.doctor.medications}:</p>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary pr-2">
                    {message.doctorConsultation.prescription.medications.map((med, i) => (
                      <li key={i} className="font-medium">{med}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-text-primary mb-1">{t.doctor.instructions}:</p>
                  <p className="text-text-secondary leading-relaxed bg-surface-2 p-2.5 rounded-lg border border-border/50">
                    {message.doctorConsultation.prescription.instructions}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prominent Clickable WHO Book Reference Badge */}
        {!isUser && effectiveBookRef && (
          <div className="mt-3 pt-2.5 border-t border-border/40">
            <button
              type="button"
              onClick={() => onOpenBookReference && onOpenBookReference(effectiveBookRef)}
              className="flex items-center gap-3 rounded-xl border border-teal/40 bg-teal/15 hover:bg-teal/25 hover:border-teal/70 px-3.5 py-2.5 text-xs text-teal transition shadow-sm w-full text-start group cursor-pointer"
              title="اضغط هنا لفتح المرجع والصفحة المقتبسة من كتاب منظمة الصحة العالمية"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal text-canvas shadow-xs group-hover:scale-110 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-text-primary group-hover:text-teal transition-colors">
                    📖 مرجع منظمة الصحة العالمية (WHO)
                  </span>
                  <span className="rounded-md bg-teal/20 px-2 py-0.5 font-mono text-[11px] font-bold text-teal border border-teal/30 shrink-0">
                    ص {effectiveBookRef.page_start}
                  </span>
                </div>
                <span className="text-[11px] text-text-secondary block truncate mt-0.5">
                  {effectiveBookRef.section_title} • انقر لمعاينة صفحة المرجع والاقتباس المعتمد
                </span>
              </div>
            </button>
          </div>
        )}

        {!isUser && message.type === 'analysis' && message.analysis && (
          <AnalysisReport analysis={message.analysis} />
        )}
      </div>

      {/* Human Avatar on Right for User */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal text-canvas shadow-sm mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
