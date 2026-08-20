import type { TranslationTree } from '../i18n/translations'
import type { AnalysisData } from '../types/chat'

type ReplyKey = 'acne' | 'eczema' | 'psoriasis' | 'contact' | 'fallback'

const KEYWORD_MAP: Array<{ key: ReplyKey; keywords: string[] }> = [
  { key: 'acne', keywords: ['acne', 'pimple', 'breakout', 'كوميدون', 'حب الشباب'] },
  {
    key: 'eczema',
    keywords: ['eczema', 'atopic', 'dermatitis', 'itchy', 'إكزيما', 'اكزيما', 'تأتبي', 'حكة'],
  },
  { key: 'psoriasis', keywords: ['psoriasis', 'plaque', 'صدفية', 'الصدفية'] },
  {
    key: 'contact',
    keywords: ['contact', 'irritant', 'allergen', 'تماسي', 'تحسس', 'مهيج'],
  },
]

export function matchReplyKey(text: string): ReplyKey {
  const normalized = text.toLowerCase()
  const match = KEYWORD_MAP.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  )
  return match?.key ?? 'fallback'
}

export function getTextReply(t: TranslationTree, text: string): string {
  const key = matchReplyKey(text)
  return t.ai[key]
}

export function getAnalysisReply(t: TranslationTree): AnalysisData {
  return {
    condition: t.ai.analysisCondition,
    confidence: 78,
    characteristics: [...t.ai.analysisCharacteristics],
    explanation: t.ai.analysisExplanation,
  }
}
