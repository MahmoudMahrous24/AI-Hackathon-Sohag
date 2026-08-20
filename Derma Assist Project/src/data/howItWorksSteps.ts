import type { LucideIcon } from 'lucide-react'
import { Layers, Microscope, Scan } from 'lucide-react'

export interface HowItWorksStep {
  id: 'describe' | 'upload' | 'analyse'
  icon: LucideIcon
}

export const howItWorksSteps: HowItWorksStep[] = [
  { id: 'describe', icon: Layers },
  { id: 'upload', icon: Scan },
  { id: 'analyse', icon: Microscope },
]
