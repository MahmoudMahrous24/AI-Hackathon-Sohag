import { useLanguage } from '../../i18n/LanguageContext'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const nextLang = lang === 'en' ? 'ar' : 'en'
  const label = nextLang === 'ar' ? 'AR' : 'EN'

  return (
    <button
      type="button"
      onClick={() => setLang(nextLang)}
      className="rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-bright hover:text-text-primary"
      aria-label={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      {label}
    </button>
  )
}
