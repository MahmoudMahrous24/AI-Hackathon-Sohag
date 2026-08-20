import { Paperclip, SendHorizontal, Stethoscope, X, Volume2, Video } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { VoiceRecorder } from './VoiceRecorder'
import { DoctorSelectorModal } from './DoctorSelectorModal'
import type { Doctor } from '../../data/doctorsData'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: (
    audioBlob?: Blob | null,
    audioUrl?: string | null,
    audioDuration?: number,
    videoUrl?: string | null
  ) => void
  onAttachClick: () => void
  onAttachVideoClick?: () => void
  selectedImage: string | null
  selectedVideo: string | null
  onRemoveImage: () => void
  onRemoveVideo?: () => void
  onSelectDoctorConsultation?: (doctor: Doctor) => void
  disabled?: boolean
  isDoctor?: boolean
}

export function Composer({
  value,
  onChange,
  onSend,
  onAttachClick,
  onAttachVideoClick,
  selectedImage,
  selectedVideo,
  onRemoveImage,
  onRemoveVideo,
  onSelectDoctorConsultation,
  disabled = false,
  isDoctor = false,
}: ComposerProps) {
  const { t } = useLanguage()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null)
  const [pendingAudioDuration, setPendingAudioDuration] = useState<number>(0)

  const canSend =
    value.trim().length > 0 ||
    Boolean(selectedImage) ||
    Boolean(selectedVideo) ||
    Boolean(pendingAudioUrl)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '44px'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [value])

  const handleAudioRecorded = (
    blob: Blob,
    url: string,
    duration: number,
    autoSend = false
  ) => {
    setPendingAudioBlob(blob)
    setPendingAudioUrl(url)
    setPendingAudioDuration(duration)

    if (autoSend) {
      onSend(blob, url, duration, selectedVideo)
      setPendingAudioUrl(null)
      setPendingAudioBlob(null)
      setPendingAudioDuration(0)
    }
  }

  const removePendingAudio = () => {
    setPendingAudioUrl(null)
    setPendingAudioBlob(null)
    setPendingAudioDuration(0)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend || disabled) return
    onSend(pendingAudioBlob, pendingAudioUrl, pendingAudioDuration, selectedVideo)
    removePendingAudio()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend && !disabled) {
        onSend(pendingAudioBlob, pendingAudioUrl, pendingAudioDuration, selectedVideo)
        removePendingAudio()
      }
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <DoctorSelectorModal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        onSelectDoctor={(doctor) => {
          if (onSelectDoctorConsultation) onSelectDoctorConsultation(doctor)
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface-2 p-3 transition focus-within:border-teal/50 focus-within:bg-surface-3 shadow-sm"
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedImage && (
            <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-sm">
              <img
                src={selectedImage}
                alt={t.chat.uploadedImageAlt}
                className="h-10 w-10 rounded-lg object-cover border border-border"
              />
              <span className="text-xs text-text-secondary">{t.chat.imageAttached}</span>
              <button
                type="button"
                onClick={onRemoveImage}
                className="rounded-full p-1 text-text-muted transition hover:bg-surface-3 hover:text-danger"
                aria-label={t.chat.removeAria}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {selectedVideo && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/20 px-3 py-1.5 text-xs text-purple-300">
              <Video className="h-4 w-4 text-purple-400" />
              <span>مقطع فيديو مرفق</span>
              <button
                type="button"
                onClick={onRemoveVideo}
                className="rounded-full p-1 text-text-muted transition hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {pendingAudioUrl && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs text-teal">
              <Volume2 className="h-4 w-4" />
              <span>{t.voice.audioAttached} ({pendingAudioDuration}s)</span>
              <button
                type="button"
                onClick={removePendingAudio}
                className="rounded-full p-1 text-text-muted transition hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={onAttachClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-3 hover:text-teal"
            aria-label="إرفاق صورة"
            title="إرفاق صورة لآفة جلدية"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {onAttachVideoClick && (
            <button
              type="button"
              onClick={onAttachVideoClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-3 hover:text-purple-400"
              aria-label="إرفاق فيديو"
              title="إرفاق مقطع فيديو سريري"
            >
              <Video className="h-4 w-4" />
            </button>
          )}

          <VoiceRecorder
            onAudioRecorded={handleAudioRecorded}
            onCancel={removePendingAudio}
            disabled={disabled}
          />

          {!isDoctor && (
            <button
              type="button"
              onClick={() => setIsDoctorModalOpen(true)}
              className="flex h-10 items-center gap-1.5 px-3 rounded-full border border-teal/30 bg-teal/10 text-xs font-semibold text-teal transition hover:bg-teal/20"
              title={t.doctor.consultTitle}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.doctor.consultTitle}</span>
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDoctor ? t.chat.doctorPlaceholder : t.chat.placeholder}
            rows={1}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted"
          />

          <button
            type="submit"
            disabled={!canSend || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-canvas transition hover:bg-teal-dim disabled:cursor-not-allowed disabled:opacity-40 shadow"
            aria-label={t.chat.sendAria}
          >
            <SendHorizontal className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </form>
      <p className="mt-2 text-center text-[11px] leading-5 text-text-muted">{t.chat.footnote}</p>
    </div>
  )
}
