export type MessageRole = 'user' | 'assistant'
export type MessageType = 'text' | 'analysis' | 'voice' | 'video' | 'doctor_consultation' | 'cds_guideline'
export type UserRole = 'patient' | 'doctor'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  birthDate?: string
  gender?: string
  phoneNumber?: string
  title?: string
  specialty?: string
  avatarUrl: string
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface BookReference {
  book_title: string
  section_title: string
  page_start: number
  page_end: number
  excerpt: string
}

export interface AnalysisData {
  condition: string
  confidence: number
  characteristics: string[]
  explanation: string
}

export interface DoctorPrescription {
  medications: string[]
  instructions: string
  urgency: 'routine' | 'urgent' | 'referral'
  doctorNotes?: string
}

export interface DoctorConsultationData {
  id?: string
  patientId?: string
  patientName?: string
  doctorId: string
  doctorName: string
  doctorTitle: string
  doctorAvatar: string
  status: 'pending' | 'replied'
  prescription?: DoctorPrescription
  doctorNotes?: string
  clinicalText?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  createdAt?: string
}

export interface Message {
  id: string
  role: MessageRole
  type?: MessageType
  text?: string
  image?: string
  videoUrl?: string
  audioUrl?: string
  audioDuration?: number
  bookReference?: BookReference
  analysis?: AnalysisData
  doctorConsultation?: DoctorConsultationData
  createdAt?: string
}

export type ActiveAppMode = 'patient' | 'doctor_cds'
