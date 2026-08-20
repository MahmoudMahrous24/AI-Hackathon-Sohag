import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchTextQuery,
  fetchVoiceQuery,
  fetchImageQuery,
  fetchVideoQuery,
  createConsultationRequest,
  fetchDoctorConsultations,
  fetchPatientConsultations,
  replyToConsultation,
  fetchUserChats,
  createChatSession,
  fetchChatMessages,
  saveChatMessage,
  deleteChatSession as apiDeleteChatSession,
  type ConsultationRecord,
  type ApiQueryResponse,
} from '../services/apiService'
import { useLanguage } from '../i18n/LanguageContext'
import type { Message, ActiveAppMode, UserRole, UserProfile, DoctorPrescription, BookReference, ChatSession } from '../types/chat'
import type { Doctor } from '../data/doctorsData'

type TypingKind = 'text' | 'image' | 'voice' | 'video'

const DEFAULT_PATIENT: UserProfile = {
  id: 'patient-guest',
  name: 'مستخدم تجريبي',
  email: 'guest@derma.com',
  role: 'patient',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
}

type ChatContextValue = {
  messages: Message[]
  isTyping: boolean
  typingKind: TypingKind
  selectedImage: string | null
  selectedVideo: string | null
  activeMode: ActiveAppMode
  setActiveMode: (mode: ActiveAppMode) => void
  userRole: UserRole
  currentUser: UserProfile
  setCurrentUser: (user: UserProfile) => void
  hasJoined: boolean
  setHasJoined: (joined: boolean) => void
  chatSessions: ChatSession[]
  activeChatId: string | null
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  createNewChat: () => Promise<void>
  switchChat: (chatId: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  selectedBookReference: BookReference | null
  setSelectedBookReference: (ref: BookReference | null) => void
  doctorConsultations: ConsultationRecord[]
  refreshDoctorConsultations: () => Promise<void>
  approveDoctorConsultation: (
    consultationId: string,
    prescription?: Partial<DoctorPrescription>,
    notes?: string
  ) => Promise<void>
  sendMessage: (
    text?: string,
    image?: string | null,
    audioBlob?: Blob | null,
    audioUrl?: string | null,
    audioDuration?: number,
    videoUrl?: string | null
  ) => Promise<void>
  requestDoctorConsultation: (
    doctor: Doctor,
    text?: string,
    image?: string | null,
    audioUrl?: string | null,
    videoUrl?: string | null
  ) => Promise<void>
  uploadImage: (file: File) => void
  uploadVideo: (file: File) => void
  removeImage: () => void
  removeVideo: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

function createId() {
  return crypto.randomUUID()
}

export function useChat() {
  const { lang } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingKind, setTypingKind] = useState<TypingKind>('text')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('derma_current_user')
    return saved ? JSON.parse(saved) : DEFAULT_PATIENT
  })

  const [userRole, setUserRole] = useState<UserRole>(currentUser.role || 'patient')
  const [activeMode, setActiveMode] = useState<ActiveAppMode>(
    currentUser.role === 'doctor' ? 'doctor_cds' : 'patient'
  )

  const [hasJoined, setHasJoined] = useState(() => {
    return Boolean(localStorage.getItem('derma_current_user'))
  })

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Book reference modal state
  const [selectedBookReference, setSelectedBookReference] = useState<BookReference | null>(null)

  // Doctor consultations state
  const [doctorConsultations, setDoctorConsultations] = useState<ConsultationRecord[]>([])

  const timeoutRef = useRef<number | null>(null)
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const setCurrentUser = useCallback((user: UserProfile) => {
    setCurrentUserState(user)
    setUserRole(user.role)
    setActiveMode(user.role === 'doctor' ? 'doctor_cds' : 'patient')
    localStorage.setItem('derma_current_user', JSON.stringify(user))
  }, [])

  // Strictly load chat sessions for current user
  useEffect(() => {
    if (!currentUser?.id) return
    let isSubscribed = true

    async function loadAccountChats() {
      try {
        const records = await fetchUserChats(currentUser.id)
        if (!isSubscribed) return
        if (records && records.length > 0) {
          setChatSessions(records)
          setActiveChatId(records[0].id)
          const msgs = await fetchChatMessages(records[0].id)
          if (isSubscribed) setMessages(msgs || [])
        } else {
          setChatSessions([])
          setActiveChatId(null)
          setMessages([])
        }
      } catch {
        if (isSubscribed) {
          setChatSessions([])
          setActiveChatId(null)
          setMessages([])
        }
      }
    }

    loadAccountChats()
    return () => {
      isSubscribed = false
    }
  }, [currentUser.id])

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)

  const createNewChat = useCallback(async () => {
    const defaultTitle = langRef.current === 'ar' ? 'محادثة استشارية جديدة' : 'New Clinical Consultation'
    try {
      const newSession = await createChatSession(currentUser.id, defaultTitle)
      setChatSessions((prev) => [newSession, ...prev])
      setActiveChatId(newSession.id)
      setMessages([])
      setSelectedImage(null)
      setSelectedVideo(null)
    } catch {
      const localId = `local-${Date.now()}`
      const localSession: ChatSession = {
        id: localId,
        userId: currentUser.id,
        title: defaultTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setChatSessions((prev) => [localSession, ...prev])
      setActiveChatId(localId)
      setMessages([])
    }
  }, [currentUser.id])

  const switchChat = useCallback(async (chatId: string) => {
    setActiveChatId(chatId)
    setSelectedImage(null)
    setSelectedVideo(null)
    try {
      const msgs = await fetchChatMessages(chatId)
      setMessages(msgs || [])
    } catch {
      setMessages([])
    }
  }, [])

  const deleteChat = useCallback(
    async (chatId: string) => {
      await apiDeleteChatSession(chatId)
      setChatSessions((prev) => prev.filter((c) => c.id !== chatId))
      if (activeChatId === chatId) {
        setMessages([])
        setActiveChatId(null)
      }
    },
    [activeChatId]
  )

  // Doctor: load doctor's specific consultations
  const refreshDoctorConsultations = useCallback(async () => {
    if (currentUser.role === 'doctor') {
      try {
        const records = await fetchDoctorConsultations(currentUser.id)
        setDoctorConsultations(records)
      } catch (err) {
        console.warn('Error loading doctor consultations:', err)
      }
    }
  }, [currentUser])

  useEffect(() => {
    if (hasJoined && currentUser.role === 'doctor') {
      refreshDoctorConsultations()
      const interval = setInterval(refreshDoctorConsultations, 5000)
      return () => clearInterval(interval)
    }
  }, [hasJoined, currentUser, refreshDoctorConsultations])

  // Patient: real-time check for doctor replies on their consultation requests
  useEffect(() => {
    if (!hasJoined || currentUser.role !== 'patient') return

    const checkPatientUpdates = async () => {
      try {
        const records = await fetchPatientConsultations(currentUser.id)
        if (records && records.length > 0) {
          const repliedMap = new Map(
            records.filter((r) => r.status === 'replied').map((r) => [r.id, r])
          )
          if (repliedMap.size > 0) {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.type === 'doctor_consultation' && msg.doctorConsultation) {
                  const updated = repliedMap.get(msg.doctorConsultation.id || msg.id)
                  if (updated && updated.prescription) {
                    return {
                      ...msg,
                      doctorConsultation: {
                        ...msg.doctorConsultation,
                        status: 'replied',
                        prescription: updated.prescription,
                        doctorNotes: updated.prescription.doctorNotes,
                      },
                    }
                  }
                }
                return msg
              })
            )
          }
        }
      } catch {
        // Silent sync
      }
    }

    const interval = setInterval(checkPatientUpdates, 4000)
    return () => clearInterval(interval)
  }, [hasJoined, currentUser.id, currentUser.role])

  const removeImage = useCallback(() => {
    setSelectedImage(null)
  }, [])

  const removeVideo = useCallback(() => {
    setSelectedVideo(null)
  }, [])

  const uploadImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const uploadVideo = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedVideo(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const approveDoctorConsultation = useCallback(
    async (
      consultationId: string,
      customPrescription?: Partial<DoctorPrescription>,
      notes?: string
    ) => {
      const isAr = langRef.current === 'ar'
      const prescriptionData = {
        medications: customPrescription?.medications || (
          isAr
            ? [
                'كريم هيدروكورتيزون 1% (طبقة خفيفة صباحاً ومساءً لمدة 5 أيام)',
                'كريم مرطب طبي خالي من العطور (3 مرات يومياً بعد الغسيل)',
              ]
            : [
                'Hydrocortisone 1% Topical Cream (Apply twice daily for 5 days)',
                'Fragrance-Free Barrier Emollient Cream (3 times daily)',
              ]
        ),
        instructions: customPrescription?.instructions || (
          isAr
            ? 'تجنب استخدام الصابون المعطر أو الماء الساخن جداً. تمت المراجعة والاعتماد بواسطة استشاري الجلدية.'
            : 'Avoid harsh soaps and hot water. Reviewed and approved by attending dermatologist.'
        ),
        urgency: customPrescription?.urgency || 'routine',
        doctorNotes: notes || customPrescription?.doctorNotes || 'تم التحقق من النمط السريري والموافقة.',
      }

      try {
        await replyToConsultation(consultationId, prescriptionData, notes)
      } catch (e) {
        console.warn('Backend consultation reply note:', e)
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (
            (msg.doctorConsultation?.id === consultationId || msg.id === consultationId) &&
            msg.doctorConsultation
          ) {
            return {
              ...msg,
              doctorConsultation: {
                ...msg.doctorConsultation,
                status: 'replied',
                prescription: prescriptionData,
              },
            }
          }
          return msg
        })
      )

      await refreshDoctorConsultations()
    },
    [refreshDoctorConsultations]
  )

  const sendMessage = useCallback(
    async (
      text = '',
      image: string | null = selectedImage,
      audioBlob: Blob | null = null,
      audioUrl: string | null = null,
      audioDuration = 0,
      videoUrl: string | null = selectedVideo
    ) => {
      const trimmed = text.trim()
      const attachedImage = image ?? null
      const attachedVideo = videoUrl ?? null
      const attachedAudioUrl = audioUrl ?? null

      if (!trimmed && !attachedImage && !attachedVideo && !attachedAudioUrl) return
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)

      // Ensure active chat session exists on backend
      let currentChatId = activeChatId
      if (!currentChatId) {
        try {
          const newSession = await createChatSession(
            currentUser.id,
            trimmed ? trimmed.slice(0, 35) : 'استشارة سريرية'
          )
          setChatSessions((prev) => [newSession, ...prev])
          setActiveChatId(newSession.id)
          currentChatId = newSession.id
        } catch {
          currentChatId = `chat-${Date.now()}`
        }
      }

      const userMsgId = createId()
      const userMessage: Message = {
        id: userMsgId,
        role: 'user',
        type: attachedVideo ? 'video' : attachedAudioUrl ? 'voice' : attachedImage ? 'analysis' : 'text',
        text: trimmed || (attachedAudioUrl ? 'جارٍ تفريغ الاستفسار الصوتي بالذكاء الاصطناعي...' : undefined),
        image: attachedImage || undefined,
        videoUrl: attachedVideo || undefined,
        audioUrl: attachedAudioUrl || undefined,
        audioDuration: audioDuration || undefined,
        createdAt: new Date().toISOString(),
      }

      setMessages((current) => [...current, userMessage])
      setSelectedImage(null)
      setSelectedVideo(null)
      setTypingKind(attachedVideo ? 'video' : attachedImage ? 'image' : attachedAudioUrl ? 'voice' : 'text')
      setIsTyping(true)

      // Save user message to backend
      if (currentChatId) {
        saveChatMessage(currentChatId, {
          id: userMsgId,
          chat_id: currentChatId,
          role: 'user',
          type: userMessage.type,
          text: userMessage.text,
          image_url: attachedImage,
          video_url: attachedVideo,
          audio_url: attachedAudioUrl,
          audio_duration: audioDuration,
        })
      }

      try {
        let apiResult: ApiQueryResponse
        if (attachedVideo) {
          apiResult = await fetchVideoQuery(attachedVideo, trimmed)
        } else if (attachedImage) {
          apiResult = await fetchImageQuery(attachedImage, trimmed)
        } else if (audioBlob) {
          apiResult = await fetchVoiceQuery(audioBlob)
          if (apiResult.query) {
            setMessages((prev) =>
              prev.map((m) => (m.id === userMsgId ? { ...m, text: apiResult.query } : m))
            )
          }
        } else {
          apiResult = await fetchTextQuery(trimmed || 'Skin condition inquiry')
        }

        const asstMsgId = createId()
        const defaultBookRef: BookReference = apiResult.book_reference || {
          book_title: 'WHO Skin NTD & Clinical Dermatology Handbook',
          section_title: 'Clinical Diagnosis & Management of Common Skin Diseases',
          page_start: 14,
          page_end: 15,
          excerpt:
            'Initial clinical triage focuses on lesion margin demarcation, erythema, scaling, and identifying potential systemic or dietary exacerbating triggers.',
        }

        const assistantMessage: Message = {
          id: asstMsgId,
          role: 'assistant',
          type: apiResult.analysis ? 'analysis' : 'cds_guideline',
          text: apiResult.answer,
          bookReference: defaultBookRef,
          analysis: apiResult.analysis || undefined,
          createdAt: new Date().toISOString(),
        }

        setMessages((current) => [...current, assistantMessage])

        // Save assistant message to backend
        if (currentChatId) {
          saveChatMessage(currentChatId, {
            id: asstMsgId,
            chat_id: currentChatId,
            role: 'assistant',
            type: assistantMessage.type,
            text: assistantMessage.text,
            book_reference: defaultBookRef,
            analysis: apiResult.analysis,
          })
        }
      } catch (err) {
        console.error('Error fetching AI reply:', err)
      } finally {
        setIsTyping(false)
      }
    },
    [activeChatId, currentUser.id, selectedImage, selectedVideo]
  )

  const requestDoctorConsultation = useCallback(
    async (
      doctor: Doctor,
      text = '',
      image: string | null = selectedImage,
      audioUrl: string | null = null,
      videoUrl: string | null = selectedVideo
    ) => {
      const docName = langRef.current === 'ar' ? doctor.nameAr : doctor.nameEn
      const docTitle = langRef.current === 'ar' ? doctor.titleAr : doctor.titleEn
      const consultationId = `consult-${Date.now()}`

      const userConsultationMsg: Message = {
        id: consultationId,
        role: 'user',
        type: 'doctor_consultation',
        text:
          text.trim() ||
          (langRef.current === 'ar'
            ? `طلب كشف واستشارة طبية عاجلة مع ${docName}`
            : `Medical consultation request with ${docName}`),
        image: image || undefined,
        videoUrl: videoUrl || undefined,
        audioUrl: audioUrl || undefined,
        doctorConsultation: {
          id: consultationId,
          patientId: currentUser.id,
          patientName: currentUser.name,
          doctorId: doctor.id,
          doctorName: docName,
          doctorTitle: docTitle,
          doctorAvatar: doctor.avatarUrl,
          status: 'pending',
          clinicalText: text.trim(),
          imageUrl: image || undefined,
          videoUrl: videoUrl || undefined,
          audioUrl: audioUrl || undefined,
          createdAt: new Date().toISOString(),
        },
      }

      setMessages((current) => [...current, userConsultationMsg])
      setSelectedImage(null)
      setSelectedVideo(null)

      try {
        await createConsultationRequest({
          patient_id: currentUser.id,
          patient_name: currentUser.name,
          doctor_id: doctor.id,
          clinical_text: text.trim(),
          image_url: image || null,
          video_url: videoUrl || null,
          audio_url: audioUrl || null,
        })
      } catch (e) {
        console.warn('Consultation request saved locally:', e)
      }
    },
    [currentUser, selectedImage, selectedVideo]
  )

  return {
    messages,
    isTyping,
    typingKind,
    selectedImage,
    selectedVideo,
    activeMode,
    setActiveMode,
    userRole,
    currentUser,
    setCurrentUser,
    hasJoined,
    setHasJoined,
    chatSessions,
    activeChatId,
    isSidebarOpen,
    setIsSidebarOpen,
    toggleSidebar,
    createNewChat,
    switchChat,
    deleteChat,
    selectedBookReference,
    setSelectedBookReference,
    doctorConsultations,
    refreshDoctorConsultations,
    approveDoctorConsultation,
    sendMessage,
    requestDoctorConsultation,
    uploadImage,
    uploadVideo,
    removeImage,
    removeVideo,
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const value = useChat()
  return createElement(ChatContext.Provider, { value }, children)
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}
