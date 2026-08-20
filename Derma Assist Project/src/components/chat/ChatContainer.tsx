import { RotateCcw, User, Stethoscope, CheckCircle2, Clock, Pill, Menu } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useChatContext } from '../../hooks/useChat'
import { useLanguage } from '../../i18n/LanguageContext'
import { Composer } from './Composer'
import { EmptyState } from './EmptyState'
import { MessageList } from './MessageList'
import { Sidebar } from './Sidebar'
import { BookReferenceModal } from './BookReferenceModal'
import type { Doctor } from '../../data/doctorsData'

export function ChatContainer() {
  const { t } = useLanguage()
  const {
    messages,
    isTyping,
    typingKind,
    selectedImage,
    selectedVideo,
    userRole,
    currentUser,
    chatSessions,
    activeChatId,
    isSidebarOpen,
    toggleSidebar,
    createNewChat,
    switchChat,
    deleteChat,
    selectedBookReference,
    setSelectedBookReference,
    doctorConsultations,
    approveDoctorConsultation,
    sendMessage,
    requestDoctorConsultation,
    uploadImage,
    uploadVideo,
    removeImage,
    removeVideo,
  } = useChatContext()

  const [draft, setDraft] = useState('')
  const [selectedConsultationForReply, setSelectedConsultationForReply] = useState<string | null>(null)
  const [customMeds, setCustomMeds] = useState('كريم هيدروكورتيزون 1% (مرتين يومياً لمدة 5 أيام)\nكريم مرطب طبي خالي من العطور (3 مرات يومياً)')
  const [customInstructions, setCustomInstructions] = useState('تجنب الماء الساخن واستخدام صابون خالي من العطور. راجع العيادة عند استمرار الأعراض.')
  const [customUrgency, setCustomUrgency] = useState<'routine' | 'urgent' | 'referral'>('routine')

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const isDoctor = userRole === 'doctor' || currentUser.role === 'doctor'
  const pendingConsultations = doctorConsultations.filter((c) => c.status === 'pending')

  const openImagePicker = () => imageInputRef.current?.click()
  const openVideoPicker = () => videoInputRef.current?.click()

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadImage(file)
    event.target.value = ''
  }

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadVideo(file)
    event.target.value = ''
  }

  const handleSend = (
    audioBlob?: Blob | null,
    audioUrl?: string | null,
    audioDuration?: number,
    videoUrl?: string | null,
    overrideText?: string
  ) => {
    const textToSend = overrideText !== undefined ? overrideText : draft
    sendMessage(textToSend, selectedImage, audioBlob, audioUrl, audioDuration, videoUrl || selectedVideo)
    setDraft('')
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    requestDoctorConsultation(doctor, draft, selectedImage, null, selectedVideo)
    setDraft('')
  }

  const handleApprovePrescriptionSubmit = async (consultationId: string) => {
    const medsArray = customMeds
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean)

    await approveDoctorConsultation(
      consultationId,
      {
        medications: medsArray,
        instructions: customInstructions,
        urgency: customUrgency,
      },
      'تم فحص الحالة واعتماد الروشتة رسمياً.'
    )
    setSelectedConsultationForReply(null)
  }

  return (
    <div className="flex h-[min(760px,88vh)] max-h-[88vh] w-full max-w-[1020px] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
      {/* Book Reference Modal */}
      <BookReferenceModal
        isOpen={Boolean(selectedBookReference)}
        onClose={() => setSelectedBookReference(null)}
        reference={selectedBookReference}
      />

      {/* Chat Sessions Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        chats={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={switchChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
      />

      {/* Main Chat Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-3 bg-surface-2/90 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface transition"
              title="سجل المحادثات"
            >
              <Menu className="h-5 w-5" />
            </button>

            <p className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>DermaAssist</span>
              <span className="text-[10px] bg-teal/15 text-teal px-2 py-0.5 rounded-full font-mono">CDS</span>
            </p>

            {/* Strict Active Role Badge */}
            <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs bg-surface border-border">
              {isDoctor ? (
                <>
                  <Stethoscope className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-purple-300">لوحة الطبيب المتخصص</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5 text-teal" />
                  <span className="text-teal">استشارة مريض</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={createNewChat}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-text-muted transition hover:text-text-secondary hover:bg-surface-3 border border-border/50"
            aria-label={t.chat.resetAria}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.chat.newConversation}</span>
          </button>
        </div>

        {/* Mode Banner */}
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b transition ${
            isDoctor
              ? 'bg-purple-950/40 border-purple-800/40 text-purple-200'
              : 'bg-teal-glow border-teal/20 text-teal'
          }`}
        >
          <div className="flex items-center gap-2">
            {isDoctor ? <Stethoscope className="h-4 w-4 text-purple-400" /> : <User className="h-4 w-4 text-teal" />}
            <span className="font-semibold">
              {isDoctor
                ? `لوحة الطبيب: ${currentUser.name} (${currentUser.title || 'استشاري جلدية'})`
                : `بوابة المريض: ${currentUser.name} — اطلب استشارة أو اسأل المساعد`}
            </span>
          </div>
        </div>

        {/* Doctor Dashboard: Consultation Queue */}
        {isDoctor && (
          <div className="border-b border-border bg-surface-2 p-3 text-xs max-h-44 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span>طلبات الكشف الموجهة لـ {currentUser.name} ({pendingConsultations.length})</span>
              </h4>
              <span className="text-[10px] text-text-muted">تحديث تلقائي</span>
            </div>

            {pendingConsultations.length === 0 ? (
              <p className="text-[11px] text-text-muted py-1">لا توجد طلبات كشف جديدة بانتظارك حالياً.</p>
            ) : (
              <div className="space-y-2">
                {pendingConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-text-primary">المريض: {c.patientName}</span>
                      <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                        {c.clinicalText || 'طلب فحص آفة جلدية'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedConsultationForReply(c.id)}
                        className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1 rounded-lg text-xs transition shadow"
                      >
                        <Pill className="h-3 w-3" />
                        <span>كتابة واعتماد الروشتة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal for Doctor to write Prescription */}
        {selectedConsultationForReply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg rounded-2xl border border-purple-500/40 bg-surface p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-400" />
                <span>إصدار واعتماد الروشتة الطبية الرسمية</span>
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                اكتب الأدوية والتعليمات الطبية للمريض وسيتم إرسالها رسمياً للمريض.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">
                    الأدوية الموصوفة (كل دواء في سطر):
                  </label>
                  <textarea
                    rows={3}
                    value={customMeds}
                    onChange={(e) => setCustomMeds(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text-primary outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">
                    التعليمات وإرشادات الاستخدام:
                  </label>
                  <textarea
                    rows={2}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text-primary outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">
                    مستوى الأهمية والسرعة:
                  </label>
                  <select
                    value={customUrgency}
                    onChange={(e) => setCustomUrgency(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text-primary outline-none focus:border-purple-500"
                  >
                    <option value="routine">علاج روتيني منزلي (Routine)</option>
                    <option value="urgent">حالة عاجلة تستوجب العناية (Urgent)</option>
                    <option value="referral">إحالة لمركز متخصص (Referral)</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedConsultationForReply(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-3 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePrescriptionSubmit(selectedConsultationForReply)}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-semibold shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>اعتماد الروشتة وإرسالها</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Timeline */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !isTyping ? (
            <EmptyState isDoctor={isDoctor} />
          ) : (
            <MessageList
              messages={messages}
              isTyping={isTyping}
              typingKind={typingKind}
              onOpenBookReference={(ref) => setSelectedBookReference(ref)}
            />
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageChange}
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleVideoChange}
        />

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={(blob, url, duration, vidUrl) => handleSend(blob, url, duration, vidUrl)}
          onAttachClick={openImagePicker}
          onAttachVideoClick={openVideoPicker}
          selectedImage={selectedImage}
          selectedVideo={selectedVideo}
          onRemoveImage={removeImage}
          onRemoveVideo={removeVideo}
          onSelectDoctorConsultation={handleDoctorSelect}
          disabled={isTyping}
          isDoctor={isDoctor}
        />
      </div>
    </div>
  )
}
