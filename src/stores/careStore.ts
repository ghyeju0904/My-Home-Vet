import { create } from 'zustand'
import type { BehaviorAnalysis, BehaviorIntake, DietConsult, HealthContext, MealPlan, PetProfile, Reminder } from '@/domain/care'

type CareState = {
  profile: PetProfile
  health: HealthContext
  intake: BehaviorIntake
  analysis: BehaviorAnalysis | null
  diet: DietConsult | null
  mealPlan: MealPlan | null
  reminders: Reminder[]
  notificationsEnabled: boolean
  prepLeadMinutes: number
  mealTimes: { breakfast: string; dinner: string; snack?: string }

  setProfile: (p: Partial<PetProfile>) => void
  setHealth: (h: Partial<HealthContext>) => void
  setIntake: (i: Partial<BehaviorIntake>) => void
  setAnalysis: (a: BehaviorAnalysis | null) => void
  setDiet: (d: DietConsult | null) => void
  setMealPlan: (p: MealPlan | null) => void
  setReminders: (r: Reminder[]) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setPrepLeadMinutes: (minutes: number) => void
  setMealTimes: (t: Partial<{ breakfast: string; dinner: string; snack?: string }>) => void
  resetAll: () => void
}

const storageKey = 'pawcare_state'

function safeLoad(): Partial<CareState> | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as Partial<CareState>
  } catch {
    return null
  }
}

function persist(state: CareState) {
  try {
    const snapshot: Partial<CareState> = {
      profile: state.profile,
      health: state.health,
      intake: state.intake,
      mealPlan: state.mealPlan,
      notificationsEnabled: state.notificationsEnabled,
      prepLeadMinutes: state.prepLeadMinutes,
      mealTimes: state.mealTimes,
    }
    localStorage.setItem(storageKey, JSON.stringify(snapshot))
  } catch {
    return
  }
}

const defaultState: Omit<
  CareState,
  | 'setProfile'
  | 'setHealth'
  | 'setIntake'
  | 'setAnalysis'
  | 'setDiet'
  | 'setMealPlan'
  | 'setReminders'
  | 'setNotificationsEnabled'
  | 'setPrepLeadMinutes'
  | 'setMealTimes'
  | 'resetAll'
> = {
  profile: {
    name: '',
    species: 'dog',
    breed: '',
    ageYears: 3,
    weightKg: 5,
    sex: 'unknown',
    neutered: null,
    activityLevel: 'medium',
  },
  health: { conditions: [], allergies: [], medications: [], goal: 'maintenance' },
  intake: {
    freeText: '',
    duration: 'days',
    appetiteChange: 'none',
    waterIntakeChange: 'none',
    vomit: false,
    diarrhea: false,
    coughSneezing: false,
    itching: false,
    lethargy: false,
    painSigns: false,
    anxiety: false,
  },
  analysis: null,
  diet: null,
  mealPlan: null,
  reminders: [],
  notificationsEnabled: false,
  prepLeadMinutes: 25,
  mealTimes: { breakfast: '08:00', dinner: '19:00', snack: '15:00' },
}

export const useCareStore = create<CareState>((set) => {
  const loaded = safeLoad()
  const initial: CareState = {
    ...(defaultState as CareState),
    ...loaded,
    analysis: null,
    diet: null,
    reminders: [],
    setProfile: (p) => set(s => {
      const next = { ...s, profile: { ...s.profile, ...p } }
      persist(next)
      return next
    }),
    setHealth: (h) => set(s => {
      const next = { ...s, health: { ...s.health, ...h } }
      persist(next)
      return next
    }),
    setIntake: (i) => set(s => {
      const next = { ...s, intake: { ...s.intake, ...i } }
      persist(next)
      return next
    }),
    setAnalysis: (a) => set({ analysis: a }),
    setDiet: (d) => set({ diet: d }),
    setMealPlan: (p) => set(s => {
      const next = { ...s, mealPlan: p }
      persist(next)
      return next
    }),
    setReminders: (r) => set({ reminders: r }),
    setNotificationsEnabled: (enabled) => set(s => {
      const next = { ...s, notificationsEnabled: enabled }
      persist(next)
      return next
    }),
    setPrepLeadMinutes: (minutes) => set(s => {
      const next = { ...s, prepLeadMinutes: Math.max(0, Math.min(180, Math.round(minutes))) }
      persist(next)
      return next
    }),
    setMealTimes: (t) => set(s => {
      const next = { ...s, mealTimes: { ...s.mealTimes, ...t } }
      persist(next)
      return next
    }),
    resetAll: () => {
      const next = { ...(defaultState as CareState) }
      set(next)
      persist(next)
    },
  }
  return initial
})
