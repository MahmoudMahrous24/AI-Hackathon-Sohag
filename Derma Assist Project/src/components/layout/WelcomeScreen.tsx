import { User, Stethoscope, ArrowLeft, LogIn, UserPlus, AlertCircle, CheckCircle2, Mail, Lock, Calendar, Phone, Camera } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { useChatContext } from '../../hooks/useChat'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { loginUser, registerUser } from '../../services/apiService'
import type { UserRole, UserProfile } from '../../types/chat'

export function WelcomeScreen() {
  const { t } = useLanguage()
  const { setCurrentUser, setHasJoined } = useChatContext()

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [tab, setTab] = useState<'login' | 'register'>('login')
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
      const userProfile: UserProfile = {
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
      setTimeout(() => {
        setCurrentUser(userProfile)
        setHasJoined(true)
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
      setErrorMsg('كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة الإدخال.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب ألا تقل عن 6 أحرف.')
      return
    }

    if (!birthDate) {
      setErrorMsg('يرجى تحديد تاريخ الميلاد.')
      return
    }

    setLoading(true)
    try {
      const targetRole = selectedRole || 'patient'
      const res = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: targetRole,
        birth_date: birthDate,
        gender,
        phone_number: phoneNumber.trim(),
        title: targetRole === 'doctor' ? (title.trim() || 'استشاري أمراض الجلدية') : undefined,
        specialty: targetRole === 'doctor' ? (specialty.trim() || 'الأمراض الجلدية العامة') : undefined,
        avatar_url: avatarUrl || undefined,
      })
      setSuccessMsg(res.message)
      const userProfile: UserProfile = {
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
      setTimeout(() => {
        setCurrentUser(userProfile)
        setHasJoined(true)
      }, 500)
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary relative selection:bg-teal selection:text-canvas">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rtl:left-4 rtl:right-auto sm:rtl:left-6 z-50 flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="mb-6 text-center animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal font-display text-3xl font-bold text-canvas shadow-xl mb-3">
            D
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
            DermaAssist AI
          </h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            منظومة الدعم السريري الذكي لطب الجلدية — فرز آلي للأعراض، استشارات معتمدة، ودليل تشخيصي موثوق.
          </p>
        </div>

        {!selectedRole ? (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Patient Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('patient')
                  setErrorMsg(null)
                }}
                className="flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl border border-teal/30 bg-surface-2 hover:bg-surface-3 hover:border-teal/60 transition cursor-pointer group shadow-lg"
              >
                <div className="h-16 w-16 rounded-2xl bg-teal/15 flex items-center justify-center text-teal mb-4 group-hover:scale-110 transition-transform">
                  <User className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-text-primary mb-2">
                  {t.role.patientRole}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  اطلب استشارتك، ارفع صور الآفات الجلدية، سجل مقاطع صوتية، وتواصل مع كبار أطباء الجلدية المعتمدين.
                </p>
              </button>

              {/* Doctor Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor')
                  setErrorMsg(null)
                }}
                className="flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-surface-2 hover:bg-surface-3 hover:border-purple-500/60 transition cursor-pointer group shadow-lg"
              >
                <div className="h-16 w-16 rounded-2xl bg-purple-600/15 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-text-primary mb-2">
                  {t.role.doctorRole}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  لوحة تحكم الطبيب لمراجعة طلبات الكشف الموجهة لك، الاطلاع على الأدلة السريرية، واعتماد الروشتات.
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <div className="w-full max-w-md animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setSelectedRole(null)
                setErrorMsg(null)
              }}
              className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary mb-3 transition"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span>العودة لاختيار نوع الحساب</span>
            </button>

            <div className="bg-surface-2 p-6 sm:p-7 rounded-3xl border border-border shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-3">
                {selectedRole === 'doctor' ? (
                  <Stethoscope className="h-6 w-6 text-purple-400" />
                ) : (
                  <User className="h-6 w-6 text-teal" />
                )}
                <h2 className="text-xl font-bold">
                  {selectedRole === 'doctor' ? 'حساب طبيب متخصص' : 'حساب مريض'}
                </h2>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 rounded-2xl bg-surface p-1 mb-4 border border-border">
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

              {/* Error & Success Messages */}
              {errorMsg && (
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-2.5 text-xs text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-2.5 ltr:left-3 rtl:right-3 h-4 w-4 text-text-muted" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface ltr:pl-9 rtl:pr-9 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <Lock className="absolute top-2.5 ltr:left-3 rtl:right-3 h-4 w-4 text-text-muted" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface ltr:pl-9 rtl:pr-9 py-2 text-xs text-text-primary outline-none focus:border-teal transition"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full rounded-xl py-2.5 font-bold text-white transition mt-2 shadow-lg flex items-center justify-center gap-2 text-xs ${
                      selectedRole === 'doctor' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-teal hover:bg-teal-dim'
                    }`}
                  >
                    {loading ? <span className="animate-spin">🌀</span> : <LogIn className="h-4 w-4" />}
                    <span>تسجيل الدخول للمنظومة</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={selectedRole === 'doctor' ? 'د. سارة محمود' : 'أحمد علي'}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                    />
                  </div>

                  {/* Optional Profile Picture Upload */}
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                      <Camera className="h-3 w-3 text-teal" />
                      <span>صورة الملف الشخصي (اختياري)</span>
                    </label>
                    <div className="flex items-center gap-3 p-1.5 rounded-xl bg-surface border border-border">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-9 w-9 rounded-full object-cover border border-teal/40 shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted text-xs shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarFileChange}
                        className="text-xs text-text-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal/20 file:text-teal hover:file:bg-teal/30 cursor-pointer"
                      />
                    </div>
                  </div>

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
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-teal transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        الجنس
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>الهاتف</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="01012345678"
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        البريد
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                      />
                    </div>
                  </div>

                  {selectedRole === 'doctor' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          المسمى الطبي
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="استشاري جلدية"
                          className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          التخصص
                        </label>
                        <input
                          type="text"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          placeholder="حب الشباب، الأكزيما"
                          className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                        />
                      </div>
                    </div>
                  )}

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
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
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
                        className="w-full rounded-xl border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full rounded-xl py-2.5 font-bold text-white transition mt-2 shadow-lg flex items-center justify-center gap-2 text-xs ${
                      selectedRole === 'doctor' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-teal hover:bg-teal-dim'
                    }`}
                  >
                    {loading ? <span className="animate-spin">🌀</span> : <UserPlus className="h-4 w-4" />}
                    <span>إنشاء الحساب والدخول</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
