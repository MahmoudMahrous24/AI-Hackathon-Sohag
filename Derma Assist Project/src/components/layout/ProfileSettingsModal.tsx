import { useState } from 'react'
import { X, User, Stethoscope, Mail, Phone, Calendar, Camera, Lock, Save, Trash2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { updateUserProfile, deleteUserProfile } from '../../services/apiService'
import type { UserProfile } from '../../types/chat'

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile
  onProfileUpdated: (updatedUser: UserProfile) => void
  onAccountDeleted: () => void
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onAccountDeleted,
}: ProfileSettingsModalProps) {
  const [name, setName] = useState(currentUser.name || '')
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '')
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || '')
  const [gender, setGender] = useState<'male' | 'female'>((currentUser.gender as 'male' | 'female') || 'male')
  const [title, setTitle] = useState(currentUser.title || '')
  const [specialty, setSpecialty] = useState(currentUser.specialty || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatarUrl || null)
  const [newPassword, setNewPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const isDoctor = currentUser.role === 'doctor'

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await updateUserProfile(currentUser.id, {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        birth_date: birthDate,
        gender,
        title: isDoctor ? title.trim() : undefined,
        specialty: isDoctor ? specialty.trim() : undefined,
        avatar_url: avatarUrl || undefined,
        password: newPassword ? newPassword : undefined,
      })

      const updatedProfile: UserProfile = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        birthDate: res.user.birthDate,
        gender: res.user.gender,
        phoneNumber: res.user.phoneNumber,
        title: res.user.title || undefined,
        specialty: res.user.specialty || undefined,
        avatarUrl: res.user.avatarUrl,
      }

      setSuccessMsg('تم حفظ التعديلات وتحديث بيانات الحساب بنجاح!')
      onProfileUpdated(updatedProfile)
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ التعديلات')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      await deleteUserProfile(currentUser.id)
      onAccountDeleted()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حذف الحساب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border-bright bg-surface p-6 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 ltr:right-5 rtl:left-5 rounded-full p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-border pb-4">
          <div className="h-12 w-12 rounded-2xl bg-teal/15 flex items-center justify-center text-teal shadow-xs">
            {isDoctor ? <Stethoscope className="h-6 w-6 text-purple-400" /> : <User className="h-6 w-6 text-teal" />}
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-text-primary">
              إعدادات وتعديل بيانات الحساب
            </h3>
            <p className="text-xs text-text-secondary">
              تعديل بياناتك الشخصية أو حذف الحساب وسجلاته
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Avatar Section */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-teal" />
              <span>صورة الملف الشخصي</span>
            </label>
            <div className="flex items-center gap-3.5 p-2 rounded-2xl bg-surface-2 border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover border-2 border-teal shadow-sm shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted text-sm shrink-0">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarFileChange}
                  className="text-xs text-text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal/20 file:text-teal hover:file:bg-teal/30 cursor-pointer"
                />
                <p className="text-[10px] text-text-muted mt-1">اختر صورة جديدة لتحديث صورتك الشخصية</p>
              </div>
            </div>
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              البريد الإلكتروني (المعرف الأساسي)
            </label>
            <div className="relative">
              <Mail className="absolute top-2.5 ltr:left-3 rtl:right-3 h-4 w-4 text-text-muted" />
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full rounded-xl border border-border/50 bg-surface-3 ltr:pl-9 rtl:pr-9 py-2 text-xs text-text-muted cursor-not-allowed"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              الاسم الكامل
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
            />
          </div>

          {/* Phone & Birth Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>رقم الهاتف</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>تاريخ الميلاد</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              الجنس
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
            >
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>

          {/* Doctor Details */}
          {isDoctor && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  المسمى الطبي
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  التخصص الدقيق
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
            </div>
          )}

          {/* Optional Password Update */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>تغيير كلمة المرور (اختياري)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="اتركها فارغة إذا كنت لا تريد تغييرها"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-teal py-2.5 font-bold text-canvas hover:bg-teal-dim transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-xs"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 px-3.5 py-2.5 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>حذف الحساب</span>
            </button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-5 rounded-3xl animate-fade-in text-center">
            <div className="space-y-4 max-w-xs">
              <div className="h-12 w-12 rounded-full bg-danger/20 text-danger mx-auto flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-text-primary">
                تأكيد حذف الحساب نهائياً
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                هل أنت متأكد؟ سيتم حذف حسابك وجميع سجلات المحادثات والاستشارات المرتبطة به نهائياً ولا يمكن استرجاعها.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-text-secondary bg-surface-2 hover:bg-surface-3 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDeleteAccount}
                  className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white hover:bg-danger/80 transition shadow"
                >
                  {loading ? 'جاري الحذف...' : 'نعم، احذف الحساب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
