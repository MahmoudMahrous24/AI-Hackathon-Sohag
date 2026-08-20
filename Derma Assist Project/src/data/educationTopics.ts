export type EducationTopicId = 'acne' | 'atopic' | 'psoriasis' | 'contact'

export interface EducationTopicMeta {
  id: EducationTopicId
}

export const educationTopics: EducationTopicMeta[] = [
  { id: 'acne' },
  { id: 'atopic' },
  { id: 'psoriasis' },
  { id: 'contact' },
]
