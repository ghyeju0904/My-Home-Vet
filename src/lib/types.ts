export type Species = 'dog' | 'cat' | 'other'

export type Pet = {
  id: string
  user_id: string | null
  device_id: string
  name: string
  species: Species
  breed: string | null
  age_years: number | null
  weight_kg: number | null
  gender: 'male' | 'female' | 'unknown' | null
  is_neutered: boolean
  last_checkup_date: string | null
  routine: Record<string, unknown>
  allergies: string[]
  health_conditions: unknown[]
  created_at: string
  updated_at: string
}

export type UrgencyLevel = 'low' | 'medium' | 'high'

export type BehaviorAnalysisRow = {
  id: string
  pet_id: string
  device_id: string
  symptoms: unknown
  description: string | null
  duration_days: number | null
  urgency_level: UrgencyLevel
  likely_causes: unknown
  recommendations: unknown
  created_at: string
}

export type DietPlanRow = {
  id: string
  pet_id: string
  device_id: string
  start_date: string
  end_date: string
  plan: unknown
  created_at: string
}

export type NotificationRow = {
  id: string
  user_id: string | null
  device_id: string
  type: string
  title: string
  content: string
  data: unknown
  scheduled_at: string | null
  sent_at: string | null
  read_at: string | null
  created_at: string
}
