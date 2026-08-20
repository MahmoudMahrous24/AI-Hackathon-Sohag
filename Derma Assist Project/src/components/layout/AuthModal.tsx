import { useState } from 'react'
import { X, User, Stethoscope, Mail, Lock, AlertCircle, CheckCircle2, UserPlus, LogIn, Calendar, Phone, Camera } from 'lucide-react'
import { loginUser, registerUser } from '../../services/apiService'
import type { UserProfile, UserRole } from '../../types/chat'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: (user: UserProfile) => void
  initialTab?: 'login' | 'register'
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [role, setRole] = useState<UserRole>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [title, setTitle] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await loginUser(email, password)
      setSuccessMsg(res.message)
      setTimeout(() => {
        onAuthSuccess({
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
        })
        onClose()
      }, 500)
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين. يرجى التحقق وإعادة الإدخال.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.')
      return
    }

    if (!birthDate) {
      setErrorMsg('يرجى تحديد تاريخ الميلاد.')
      return
    }

    setLoading(true)
    try {
      const res = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        birth_date: birthDate,
        gender,
        phone_number: phoneNumber.trim(),
        title: role === 'doctor' ? (title.trim() || 'استشاري أمراض الجلدية') : undefined,
        specialty: role === 'doctor' ? (specialty.trim() || 'الأمراض الجلدية العامة') : undefined,
        avatar_url: avatarUrl || undefined,
      })
      setSuccessMsg(res.message)
      setTimeout(() => {
        onAuthSuccess({
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
        })
        onClose()
      }, 500)
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border-bright bg-surface p-6 sm:p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 ltr:right-5 rtl:left-5 rounded-full p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal font-display text-xl font-bold text-canvas shadow-lg mb-2">
            D
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary">
            {tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {tab === 'login'
              ? 'أدخل بيانات حسابك للمتابعة وإدارة الاستشارات'
              : 'اختر نوع الحساب وأدخل بياناتك الشخصية للبدء'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 rounded-2xl bg-surface-2 p-1 mb-4 border border-border">
          <button
            type="button"
            onClick={() => {
              setTab('login')
              setErrorMsg(null)
            }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition ${
              tab === 'login' ? 'bg-teal text-canvas shadow' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register')
              setErrorMsg(null)
            }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition ${
              tab === 'register' ? 'bg-teal text-canvas shadow' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>حساب جديد</span>
          </button>
        </div>

        {/* Alerts */}
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

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute top-3 ltr:left-3 rtl:right-3 h-4 w-4 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-border bg-surface-2 ltr:pl-9 rtl:pr-9 py-2.5 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute top-3 ltr:left-3 rtl:right-3 h-4 w-4 text-text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface-2 ltr:pl-9 rtl:pr-9 py-2.5 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal py-2.5 font-bold text-canvas hover:bg-teal-dim transition disabled:opacity-50 shadow-md mt-2 flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <span className="animate-spin">🌀</span> : <LogIn className="h-4 w-4" />}
              <span>تسجيل الدخول</span>
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Single Choice: Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                اختر نوع الحساب (مريض أو طبيب)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    role === 'patient'
                      ? 'border-teal bg-teal/15 text-teal shadow-xs'
                      : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-3'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>مريض</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    role === 'doctor'
                      ? 'border-purple-500 bg-purple-950/30 text-purple-300 shadow-xs'
                      : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-3'
                  }`}
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>طبيب متخصص</span>
                </button>
              </div>
            </div>

            {/* Optional Profile Picture Upload */}
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Camera className="h-3 w-3 text-teal" />
                <span>صورة الملف الشخصي (اختياري)</span>
              </label>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-2 border border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="h-10 w-10 rounded-full object-cover border border-teal/40 shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted text-xs shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarFileChange}
                  className="text-xs text-text-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal/20 file:text-teal hover:file:bg-teal/30 cursor-pointer"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'doctor' ? 'د. أحمد خالد' : 'محمود علي'}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
              />
            </div>

            {/* Date of Birth & Gender */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>تاريخ الميلاد</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  الجنس
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
            </div>

            {/* Phone Number & Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>رقم الهاتف</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01012345678"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
            </div>

            {/* Doctor specific fields */}
            {role === 'doctor' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    المسمى الطبي
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="استشاري جلدية وتناسلية"
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
                    placeholder="حب الشباب، الحساسية، الصدفية"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                  />
                </div>
              </div>
            )}

            {/* Password & Confirm */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal py-2.5 font-bold text-canvas hover:bg-teal-dim transition disabled:opacity-50 shadow-md mt-2 flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <span className="animate-spin">🌀</span> : <UserPlus className="h-4 w-4" />}
              <span>تسجيل الحساب وبدء الاستخدام</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
