import { X, Star, CheckCircle, Stethoscope, RefreshCw, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchDoctors, type DoctorItem } from '../../services/apiService'
import { useLanguage } from '../../i18n/LanguageContext'
import type { Doctor } from '../../data/doctorsData'

interface DoctorSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDoctor: (doctor: Doctor) => void
}

export function DoctorSelectorModal({ isOpen, onClose, onSelectDoctor }: DoctorSelectorModalProps) {
  const { t, lang } = useLanguage()
  const [doctors, setDoctors] = useState<DoctorItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadDynamicDoctors()
    }
  }, [isOpen])

  const loadDynamicDoctors = async () => {
    setLoading(true)
    try {
      const backendDocs = await fetchDoctors()
      setDoctors(backendDocs || [])
    } catch {
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-border-bright bg-surface p-6 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 ltr:right-5 rtl:left-5 rounded-full p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-teal mb-2">
          <Stethoscope className="h-5 w-5" />
          <span className="font-display text-xs font-bold uppercase tracking-wider">{t.doctor.consultTitle}</span>
        </div>

        <h3 className="font-display text-xl font-bold text-text-primary mb-1">
          {t.doctor.selectDoctorHeading}
        </h3>
        <p className="text-xs text-text-secondary mb-5">
          اختر الطبيب المناسب لبدء الاستشارة وسيتم إرسال طلب الكشف إلى لوحة تحكمه مباشرة.
        </p>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-muted gap-2 text-xs">
              <RefreshCw className="h-4 w-4 animate-spin text-teal" />
              <span>جاري تحميل قائمة الأطباء المعتمدين...</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-surface-2 border border-border text-xs text-text-secondary">
              <UserPlus className="h-8 w-8 text-teal mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-text-primary mb-1">لا يوجد أطباء مسجلون في النظام حالياً</p>
              <p className="text-[11px] text-text-muted">
                سجل حساباً جديداً كـ "طبيب متخصص" لتظهر في هذه القائمة وتبدأ باستقبال استشارات المرضى.
              </p>
            </div>
          ) : (
            doctors.map((doc) => {
              const name = lang === 'ar' ? doc.nameAr : doc.nameEn
              const title = lang === 'ar' ? doc.titleAr : doc.titleEn
              const specialties = lang === 'ar' ? doc.specialtiesAr : doc.specialtiesEn

              return (
                <div
                  key={doc.id}
                  className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-teal/50 hover:bg-surface-3 shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={doc.avatarUrl}
                      alt={name}
                      className="h-12 w-12 rounded-full object-cover border border-teal/40 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-text-primary">{name}</h4>
                        {doc.availableNow && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="h-2.5 w-2.5" />
                            <span>متاح للاستشارة</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-amber-400 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-mono font-semibold">{doc.rating || 4.9}</span>
                        </div>
                        <span className="text-text-muted text-xs">•</span>
                        <span className="text-text-muted text-[11px]">
                          طبيب معتمد في المنظومة
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(specialties || []).map((s) => (
                          <span key={s} className="text-[10px] text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-md">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectDoctor({
                        id: doc.id,
                        nameAr: doc.nameAr,
                        nameEn: doc.nameEn,
                        titleAr: doc.titleAr,
                        titleEn: doc.titleEn,
                        rating: doc.rating,
                        consultationsCount: doc.consultationsCount,
                        avatarUrl: doc.avatarUrl,
                        availableNow: doc.availableNow,
                        specialtiesAr: doc.specialtiesAr,
                        specialtiesEn: doc.specialtiesEn,
                      })
                      onClose()
                    }}
                    className="w-full sm:w-auto mt-2 sm:mt-0 rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-canvas transition hover:bg-teal-dim shadow-xs shrink-0"
                  >
                    {t.doctor.chooseBtn}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
