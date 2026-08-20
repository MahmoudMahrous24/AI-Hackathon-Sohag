import { ArrowRight, ChevronRight, ShieldCheck, Sparkles, Clock, Stethoscope, BookOpen, UserCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden scroll-mt-16 py-12 md:py-20" id="top">
      <div
        className="pointer-events-none absolute -top-24 start-1/2 -translate-x-1/2 h-[450px] w-[550px] rounded-full bg-[radial-gradient(circle,var(--color-teal-glow-strong),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-surface-2 px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-teal shadow-xs mb-6">
          <Sparkles className="h-3.5 w-3.5 text-teal" />
          <span>{t.hero.eyebrow}</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-tight">
          {t.hero.h1Before}{' '}
          <span className="bg-gradient-to-r from-teal via-teal-dim to-emerald-400 bg-clip-text text-transparent">
            {t.hero.h1Highlight}
          </span>{' '}
          {t.hero.h1After}
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-text-secondary">
          {t.hero.subhead}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollToId('chat')}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal px-6 py-3.5 text-sm font-bold text-canvas transition hover:bg-teal-dim shadow-lg"
          >
            <span>{t.hero.ctaPrimary}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollToId('how-it-works')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-5 py-3.5 text-sm font-semibold text-text-secondary transition hover:text-text-primary hover:bg-surface-3"
          >
            <span>{t.hero.ctaSecondary}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Value Highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-start">
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface-2/70 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">دليل WHO السريري</h4>
              <p className="text-[11px] text-text-muted">استشهادات معتمدة مع أرقام الصفحات</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface-2/70 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">استشارة أطباء معتمدين</h4>
              <p className="text-[11px] text-text-muted">مراجعة كشوفات وإصدار روشتات رسمية</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface-2/70 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">سرية وأمان طبي</h4>
              <p className="text-[11px] text-text-muted">حماية كاملة لبيانات ومحادثات المريض</p>
            </div>
          </div>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-text-muted">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            <span>{t.hero.trustNotDiagnosis}</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-teal" />
            <span>{t.hero.trustPrivate}</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-teal" />
            <span>{t.hero.trustInstant}</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
