import { Mic, Play, Pause, Square, Trash2, Send } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'

interface VoiceRecorderProps {
  onAudioRecorded: (blob: Blob, url: string, duration: number, autoSend?: boolean) => void
  onCancel?: () => void
  disabled?: boolean
}

export function VoiceRecorder({ onAudioRecorded, onCancel, disabled }: VoiceRecorderProps) {
  const { t } = useLanguage()
  const [isRecording, setIsRecording] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // Convert to base64 Data URL so it is permanent and never gets revoked or lost!
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          setRecordedBlob(blob)
          setRecordedUrl(dataUrl)
          onAudioRecorded(blob, dataUrl, seconds, false)
        }
        reader.readAsDataURL(blob)

        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start(250) // collect chunks every 250ms
      setIsRecording(true)
      setSeconds(0)

      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone permission error:', err)
      alert(t.voice.recordingState || 'يرجى السماح بالوصول إلى الميكروفون لتسجيل الرسالة الصوتية')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const togglePreviewPlay = () => {
    if (!recordedUrl) return
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(recordedUrl)
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false)
    }

    if (isPlayingPreview) {
      audioPreviewRef.current.pause()
      setIsPlayingPreview(false)
    } else {
      audioPreviewRef.current.play()
      setIsPlayingPreview(true)
    }
  }

  const handleSendNow = () => {
    if (recordedBlob && recordedUrl) {
      onAudioRecorded(recordedBlob, recordedUrl, seconds, true)
      handleDiscard()
    }
  }

  const handleDiscard = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause()
      audioPreviewRef.current = null
    }
    setRecordedUrl(null)
    setRecordedBlob(null)
    setSeconds(0)
    setIsPlayingPreview(false)
    if (onCancel) onCancel()
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (recordedUrl) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-teal/40 bg-surface-2 px-3 py-1.5 text-xs text-text-primary animate-fade-in shadow">
        <button
          type="button"
          onClick={togglePreviewPlay}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-canvas hover:bg-teal-dim transition"
          aria-label={t.voice.previewAudio}
          title={isPlayingPreview ? 'إيقاف مؤقت' : 'استماع'}
        >
          {isPlayingPreview ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="font-mono text-teal font-medium">{formatTime(seconds || 1)}</span>
        <div className="flex items-center gap-1.5 ltr:ml-auto rtl:mr-auto">
          <button
            type="button"
            onClick={handleDiscard}
            className="flex h-7 w-7 items-center justify-center rounded-full text-danger hover:bg-danger/10 transition"
            title={t.voice.cancelAudio}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSendNow}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-teal px-3 font-semibold text-canvas hover:bg-teal-dim transition"
            title="إرسال التسجيل الصوتي الآن"
          >
            <Send className="h-3 w-3 rtl:rotate-180" />
            <span>إرسال</span>
          </button>
        </div>
      </div>
    )
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger animate-pulse">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
        </span>
        <span className="font-mono font-bold">{formatTime(seconds)}</span>
        <span className="text-text-primary text-[11px] font-medium hidden sm:inline">{t.voice.recordingState}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-7 px-2.5 items-center gap-1 rounded-lg bg-danger text-white hover:bg-danger/80 transition ltr:ml-auto rtl:mr-auto text-xs font-semibold"
          title={t.voice.stopBtn}
        >
          <Square className="h-3 w-3 fill-current" />
          <span>{t.voice.stopBtn}</span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={startRecording}
      className="inline-flex items-center justify-center h-10 w-10 rounded-full text-text-secondary hover:bg-surface-3 hover:text-teal disabled:opacity-50 transition"
      title={t.voice.recordBtn}
      aria-label={t.voice.recordBtn}
    >
      <Mic className="h-4 w-4" />
    </button>
  )
}
