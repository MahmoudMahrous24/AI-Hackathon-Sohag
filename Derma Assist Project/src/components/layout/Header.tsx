import { Stethoscope, User, LogIn, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useChatContext } from '../../hooks/useChat'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { AuthModal } from './AuthModal'
import { ProfileSettingsModal } from './ProfileSettingsModal'

export function Header() {
  const { userRole, currentUser, setCurrentUser, setHasJoined } = useChatContext()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const isDoctor = userRole === 'doctor'

  const handleLogout = () => {
    localStorage.removeItem('derma_current_user')
    setHasJoined(false)
  }

  const handleAccountDeleted = () => {
    localStorage.removeItem('derma_current_user')
    setHasJoined(false)
  }

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user)
        }}
      />

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated)
        }}
        onAccountDeleted={handleAccountDeleted}
      />

      <header className="sticky top-0 z-50 h-16 border-b border-border bg-canvas/85 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5 text-text-primary group">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal font-display text-sm font-bold text-canvas shadow-lg group-hover:scale-105 transition-transform">
              D
            </span>
            <span className="font-display text-lg font-bold tracking-tight">DermaAssist</span>
          </a>

          {/* User Profile & Account Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2/90 px-3 py-1 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition"
                title="تعديل بيانات الحساب"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-7 w-7 rounded-full object-cover border border-teal/40 group-hover:border-teal"
                />
                <div className="flex flex-col text-start pr-1">
                  <span className="font-semibold text-text-primary flex items-center gap-1 text-[11px]">
                    {isDoctor ? <Stethoscope className="h-3 w-3 text-purple-400" /> : <User className="h-3 w-3 text-teal" />}
                    {currentUser.name}
                  </span>
                  <span className={`text-[9px] font-bold ${isDoctor ? 'text-purple-400' : 'text-teal'}`}>
                    {isDoctor ? (currentUser.title || 'طبيب متخصص 🩺') : 'حساب مريض 👤'}
                  </span>
                </div>
              </button>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1 rounded-full bg-surface-3 p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface border border-border transition ms-1"
                title="إعدادات وتعديل بيانات الحساب"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

              {/* Login / Switch Account Button */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border transition"
                title="تسجيل الدخول بحساب آخر أو إنشاء حساب"
              >
                <LogIn className="h-3 w-3" />
                <span className="hidden sm:inline">تبديل الحساب</span>
              </button>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-danger hover:bg-danger/10 transition border border-border bg-surface-2"
              title="تسجيل الخروج والعودة للشاشة الرئيسية"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {/* Theme Toggle & Language Toggle */}
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>
    </>
  )
}
