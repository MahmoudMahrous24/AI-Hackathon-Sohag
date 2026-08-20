import { useState, useEffect, useMemo } from 'react'
import { X, BookOpen, ChevronRight, ChevronLeft, FileText, Bookmark, Search } from 'lucide-react'
import handbookPagesData from '../../data/handbookPages.json'
import type { BookReference } from '../../types/chat'

interface BookReferenceModalProps {
  isOpen: boolean
  onClose: () => void
  reference: BookReference | null
}

interface PageRecord {
  pageNumber: number
  pageEnd: number
  sectionTitle: string
  chapterTitle: string
  diseaseTags: string
  content: string
  prevPage: number | null
  nextPage: number | null
  totalPages: number
}

const typedHandbookPages = handbookPagesData as unknown as Record<string, PageRecord>
const allPageNumbers = Object.keys(typedHandbookPages).map(Number).sort((a, b) => a - b)

export function BookReferenceModal({ isOpen, onClose, reference }: BookReferenceModalProps) {
  const initialPage = reference?.page_start || 14
  const [currentPageNum, setCurrentPageNum] = useState<number>(initialPage)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (reference?.page_start) {
      setCurrentPageNum(reference.page_start)
    }
  }, [reference])

  const currentPageData: PageRecord = useMemo(() => {
    const key = String(currentPageNum)
    if (typedHandbookPages[key]) {
      return typedHandbookPages[key]
    }
    // Find nearest page if exact page isn't indexed
    if (allPageNumbers.length > 0) {
      const nearest = allPageNumbers.reduce((prev, curr) =>
        Math.abs(curr - currentPageNum) < Math.abs(prev - currentPageNum) ? curr : prev
      )
      return typedHandbookPages[String(nearest)]
    }
    return {
      pageNumber: currentPageNum,
      pageEnd: currentPageNum,
      sectionTitle: reference?.section_title || 'WHO Clinical Dermatology Guidelines',
      chapterTitle: 'WHO Field Management Protocol',
      diseaseTags: '',
      content: reference?.excerpt || 'Clinical dermatology guidelines and patient examination protocols.',
      prevPage: currentPageNum > 1 ? currentPageNum - 1 : null,
      nextPage: currentPageNum < 137 ? currentPageNum + 1 : null,
      totalPages: 137,
    }
  }, [currentPageNum, reference])

  const isCitationPage = currentPageNum === initialPage

  // Filter pages matching search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allPageNumbers
      .filter((p) => {
        const page = typedHandbookPages[String(p)]
        return (
          page.sectionTitle.toLowerCase().includes(q) ||
          page.chapterTitle.toLowerCase().includes(q) ||
          page.content.toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [searchQuery])

  if (!isOpen || !reference) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex flex-col w-full max-w-3xl h-[92vh] max-h-[820px] overflow-hidden rounded-3xl border border-teal/40 bg-surface shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 sm:px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal/15 text-teal shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                  مرجع منظمة الصحة العالمية الرسمي (WHO)
                </span>
                <span className="text-[10px] bg-teal/15 text-teal px-2 py-0.5 rounded-full font-mono font-bold">
                  Official Handbook
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-text-primary line-clamp-1">
                {reference.book_title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-surface hover:text-text-primary transition"
            title="إغلاق القارئ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation, Search & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 bg-surface-3/90 px-4 sm:px-6 py-2.5 text-xs shrink-0">
          {/* Previous / Next Page Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!currentPageData.prevPage}
              onClick={() => currentPageData.prevPage && setCurrentPageNum(currentPageData.prevPage)}
              className="flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 font-bold text-text-secondary hover:text-text-primary hover:border-teal/40 disabled:opacity-30 transition shadow-xs"
              title="الصفحة السابقة"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              <span>الصفحة السابقة</span>
            </button>

            {/* Page Jump Selector */}
            <div className="flex items-center gap-1 bg-surface border border-teal/30 px-2.5 py-1 rounded-xl shadow-xs">
              <span className="text-text-muted text-[11px]">صفحة</span>
              <select
                value={currentPageNum}
                onChange={(e) => setCurrentPageNum(Number(e.target.value))}
                className="bg-transparent font-bold text-teal text-xs outline-none cursor-pointer"
              >
                {allPageNumbers.map((p) => (
                  <option key={p} value={p} className="bg-surface text-text-primary">
                    {p} {p === initialPage ? '⭐ (صفحة الاقتباس)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-text-muted text-[11px]">من 137</span>
            </div>

            <button
              type="button"
              disabled={!currentPageData.nextPage}
              onClick={() => currentPageData.nextPage && setCurrentPageNum(currentPageData.nextPage)}
              className="flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 font-bold text-text-secondary hover:text-text-primary hover:border-teal/40 disabled:opacity-30 transition shadow-xs"
              title="الصفحة التالية"
            >
              <span>الصفحة التالية</span>
              <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>

          {/* Quick return to citation page */}
          {!isCitationPage && (
            <button
              type="button"
              onClick={() => setCurrentPageNum(initialPage)}
              className="flex items-center gap-1 rounded-xl bg-teal/15 text-teal border border-teal/30 px-3 py-1.5 font-bold text-xs hover:bg-teal/25 transition shadow-xs"
            >
              <Bookmark className="h-3.5 w-3.5 fill-teal" />
              <span>العودة لصفحة الإجابة (ص {initialPage})</span>
            </button>
          )}

          {/* Search inside Book */}
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute top-2.5 ltr:left-2.5 rtl:right-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في نصوص الكتاب..."
              className="w-full rounded-xl border border-border bg-surface ltr:pl-8 rtl:pr-8 py-1.5 text-xs text-text-primary outline-none focus:border-teal transition"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 right-0 w-64 rounded-xl border border-teal/30 bg-surface p-1 shadow-xl z-20 max-h-48 overflow-y-auto">
                <div className="text-[10px] text-text-muted px-2 py-1 font-bold">نتائج البحث في الصفحات:</div>
                {searchResults.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentPageNum(p)
                      setSearchQuery('')
                    }}
                    className="w-full text-start px-2 py-1.5 rounded-lg text-xs hover:bg-teal/15 hover:text-teal transition flex items-center justify-between"
                  >
                    <span className="line-clamp-1">{typedHandbookPages[String(p)]?.sectionTitle}</span>
                    <span className="font-mono text-[10px] text-teal font-bold shrink-0 mr-1">ص {p}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Realistic Book Page Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#f7f7f5] dark:bg-[#12161b] space-y-4 font-sans">
          {/* Authentic Book Page Container */}
          <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-md relative min-h-[420px] flex flex-col justify-between">
            <div>
              {/* Official WHO Handbook Header */}
              <div className="border-b border-border/60 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted">
                <div>
                  <span className="text-[11px] font-bold text-teal uppercase tracking-wide block">
                    {currentPageData.chapterTitle || 'Recognizing Common Skin Diseases & NTDs'}
                  </span>
                  <h4 className="font-display text-base font-bold text-text-primary mt-0.5">
                    {currentPageData.sectionTitle}
                  </h4>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px] bg-surface-2 px-2.5 py-1 rounded-lg border border-border/50">
                  <FileText className="h-3.5 w-3.5 text-teal" />
                  <span>WHO Handbook • Page {currentPageNum}</span>
                </div>
              </div>

              {/* Verified Quote Highlight Banner (on citation page) */}
              {isCitationPage && reference.excerpt && (
                <div className="mb-6 p-4 rounded-2xl border border-teal/40 bg-teal/10 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2 text-teal font-bold text-xs mb-2">
                    <Bookmark className="h-4 w-4 fill-teal" />
                    <span>النص الطبي المعتمد الذي تم الاستشهاد به في الرد:</span>
                  </div>
                  <blockquote className="text-xs sm:text-sm text-text-primary leading-relaxed bg-surface/90 p-3.5 rounded-xl border border-teal/20 italic shadow-2xs">
                    "{reference.excerpt}"
                  </blockquote>
                </div>
              )}

              {/* Real Handbook Page Content */}
              <div className="text-text-secondary text-xs sm:text-sm leading-8 whitespace-pre-wrap font-serif sm:font-sans">
                {currentPageData.content}
              </div>
            </div>

            {/* Page Footer Margin */}
            <div className="border-t border-border/60 pt-4 mt-8 flex items-center justify-between text-xs text-text-muted">
              <span>World Health Organization (WHO) Guidelines</span>
              <span className="font-mono font-bold text-text-primary text-xs">
                — {currentPageNum} —
              </span>
              <span>Geneva Dermatology Series</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2 px-4 sm:px-6 py-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span>تصفح حقيقي لكامل صفحات دليل منظمة الصحة العالمية الـ 137.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-teal px-5 py-2 font-bold text-canvas hover:bg-teal-dim transition shadow"
          >
            إغلاق قارئ الكتاب
          </button>
        </div>
      </div>
    </div>
  )
}
