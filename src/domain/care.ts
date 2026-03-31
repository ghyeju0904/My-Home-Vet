export type Species = 'dog' | 'cat'

export type Sex = 'male' | 'female' | 'unknown'

export type ActivityLevel = 'low' | 'medium' | 'high'

export type LifeStage = 'puppy_kitten' | 'adult' | 'senior'

export type Goal =
  | 'maintenance'
  | 'weight_loss'
  | 'weight_gain'
  | 'sensitive_stomach'
  | 'skin_coat'
  | 'joint_support'
  | 'urinary_support'
  | 'kidney_support'
  | 'diabetes_support'

export type PetProfile = {
  name: string
  species: Species
  breed: string
  ageYears: number
  weightKg: number
  sex: Sex
  neutered: boolean | null
  activityLevel: ActivityLevel
}

export type HealthContext = {
  conditions: string[]
  allergies: string[]
  medications: string[]
  goal: Goal
}

export type BehaviorIntake = {
  freeText: string
  duration: 'today' | 'days' | 'weeks' | 'months'
  appetiteChange: 'none' | 'less' | 'more'
  waterIntakeChange: 'none' | 'less' | 'more'
  vomit: boolean
  diarrhea: boolean
  coughSneezing: boolean
  itching: boolean
  lethargy: boolean
  painSigns: boolean
  anxiety: boolean
}

export type TriageLevel = 'emergency_now' | 'see_vet_soon' | 'monitor'

export type CauseCandidate = {
  title: string
  why: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type BehaviorAnalysis = {
  triage: TriageLevel
  redFlags: string[]
  summary: string
  likelyCauses: CauseCandidate[]
  nextQuestions: string[]
  improvementPlan: {
    now: string[]
    next24h: string[]
    routine: string[]
    mindStability: string[]
  }
  vetVisitChecklist: string[]
}

export type Recipe = {
  id: string
  title: string
  forSpecies: Species[]
  tags: string[]
  ingredients: { item: string; amount: string }[]
  steps: string[]
  prepMinutes: number
  cookMinutes: number
  notes: string[]
}

export type MealSlot = {
  dateISO: string
  kind: 'breakfast' | 'dinner' | 'snack'
  timeHHmm: string
  recipeId?: string
}

export type DietConsult = {
  lifeStage: LifeStage
  dailyCaloriesEstimate: number
  feedingGuidance: string[]
  treatRules: string[]
  transitionPlan: string[]
  recipeLibrary: Recipe[]
  cautionNotes: string[]
}

export type MealPlan = {
  startDateISO: string
  days: number
  slots: MealSlot[]
}

export type Reminder = {
  id: string
  fireAt: number
  title: string
  body: string
}
