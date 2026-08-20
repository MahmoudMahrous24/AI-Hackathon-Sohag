import { useLanguage } from '../../i18n/LanguageContext'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 text-text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal font-display text-xs font-semibold text-canvas">
            D
          </span>
          <span className="font-display tracking-tight">DermaAssist</span>
        </a>

        <p className="max-w-md text-center text-xs leading-6 text-text-muted sm:max-w-none">
          {t.footer.line}
        </p>

        <div className="flex items-center gap-5 text-xs text-text-secondary">
          <a href="#safety" className="transition hover:text-text-primary">
            {t.footer.privacy}
          </a>
          <a href="#safety" className="transition hover:text-text-primary">
            {t.footer.disclaimer}
          </a>
          <a href="#chat" className="transition hover:text-text-primary">
            {t.footer.contact}
          </a>
        </div>
      </div>
    </footer>
  )
}
