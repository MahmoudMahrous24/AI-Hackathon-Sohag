export type SuggestionAction = 'send' | 'upload'

export interface Suggestion {
  id: string
  action: SuggestionAction
}

export const suggestions: Suggestion[] = [
  { id: 'eczema', action: 'send' },
  { id: 'upload', action: 'upload' },
  { id: 'psoriasis', action: 'send' },
]
