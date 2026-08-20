export interface Doctor {
  id: string
  nameAr: string
  nameEn: string
  titleAr: string
  titleEn: string
  rating: number
  consultationsCount: number
  avatarUrl: string
  availableNow: boolean
  specialtiesAr: string[]
  specialtiesEn: string[]
}

export const DOCTORS_LIST: Doctor[] = [
  {
    id: 'doc-1',
    nameAr: 'د. أحمد سامي',
    nameEn: 'Dr. Ahmed Samy',
    titleAr: 'استشاري أمراض الجلدية والليزر',
    titleEn: 'Consultant Dermatologist & Laser Specialist',
    rating: 4.9,
    consultationsCount: 1420,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    availableNow: true,
    specialtiesAr: ['حب الشباب', 'الأكزيما', 'الصدفية'],
    specialtiesEn: ['Acne', 'Eczema', 'Psoriasis'],
  },
  {
    id: 'doc-2',
    nameAr: 'د. سارة محمود',
    nameEn: 'Dr. Sara Mahmoud',
    titleAr: 'أخصائية جلديّة الأطفال والتأتب',
    titleEn: 'Pediatric & Atopic Dermatology Specialist',
    rating: 4.95,
    consultationsCount: 980,
    avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78964?auto=format&fit=crop&q=80&w=200',
    availableNow: true,
    specialtiesAr: ['جلدية الأطفال', 'التهاب الجلد التماسي', 'حساسية الجلد'],
    specialtiesEn: ['Pediatric Derma', 'Contact Dermatitis', 'Skin Allergies'],
  },
  {
    id: 'doc-3',
    nameAr: 'د. طارق خالد',
    nameEn: 'Dr. Tarek Khaled',
    titleAr: 'استشاري جراحة الأورام الجلدية والدعم السريري',
    titleEn: 'Dermato-Oncology & CDS Clinical Specialist',
    rating: 4.88,
    consultationsCount: 2100,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    availableNow: false,
    specialtiesAr: ['أورام الجلد', 'الفحص بالمنظار الجلدية', 'تحديد مسببات التهييج'],
    specialtiesEn: ['Dermato-Oncology', 'Dermoscopy', 'Lesion Evaluation'],
  },
]
