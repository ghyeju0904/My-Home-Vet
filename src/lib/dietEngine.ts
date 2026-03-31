import type { Pet } from '@/lib/types'

export type Meal = {
  time: string
  title: string
  recipe: string[]
  estCookMinutes: number
}

export type DailyPlan = {
  date: string
  meals: Meal[]
  snacks: Meal[]
  notes: string[]
}

export type DietPlan = {
  startDate: string
  endDate: string
  days: DailyPlan[]
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function buildDietPlan(pet: Pick<Pet, 'species' | 'age_years' | 'allergies' | 'health_conditions' | 'weight_kg'>, startDate: string, endDate: string): DietPlan {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dayCount = clamp(Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1, 1, 31)

  const age = pet.age_years ?? 0
  const isPuppyKitten = age > 0 && age < 1
  const isSenior = age >= 8
  const allergies = new Set((pet.allergies ?? []).map((x) => x.trim()).filter(Boolean))

  const baseProtein = pet.species === 'cat' ? '닭가슴살' : '살코기(닭/칠면조)'
  const safeProtein = allergies.has('닭') ? (allergies.has('연어') ? '흰살생선' : '연어') : baseProtein
  const baseCarb = pet.species === 'cat' ? '단호박' : '고구마'
  const carb = allergies.has('고구마') ? '단호박' : baseCarb

  const mealTimes = isPuppyKitten ? ['08:00', '13:00', '18:00'] : ['08:30', '18:30']
  const snackTimes = ['15:30']

  const notes: string[] = []
  if (isPuppyKitten) notes.push('성장기라 하루 급여 횟수를 늘리고, 체중 변화는 주 1회 기록해요.')
  if (isSenior) notes.push('노령기는 소화가 쉬운 식단과 가벼운 활동 루틴이 좋아요.')
  if (allergies.size > 0) notes.push('알레르기 의심 식재료는 새로운 도입을 피하고, 반응을 기록해요.')

  const days: DailyPlan[] = Array.from({ length: dayCount }).map((_, idx) => {
    const date = toISODate(addDays(start, idx))
    const meals: Meal[] = mealTimes.map((time, mealIdx) => {
      const title = mealIdx === 0 ? '아침 밥' : mealTimes.length === 2 ? '저녁 밥' : mealIdx === 1 ? '점심 밥' : '저녁 밥'
      const estCookMinutes = pet.species === 'cat' ? 12 : 15
      return {
        time,
        title,
        estCookMinutes,
        recipe: [
          `${safeProtein} 익혀서 식혀서 준비`,
          `${carb} 찌거나 삶아서 으깨기`,
          '따뜻한 물/육수로 촉촉하게 섞기',
          '급여 전 손으로 온도 확인',
        ],
      }
    })
    const snacks: Meal[] = snackTimes.map((time) => ({
      time,
      title: '간식(훈련용 소량)',
      estCookMinutes: 0,
      recipe: ['동결건조/저알레르기 간식을 소량만', '훈련 보상으로 1~2분 내 끝내기'],
    }))

    return {
      date,
      meals,
      snacks,
      notes: idx === 0 ? notes : [],
    }
  })

  return { startDate: toISODate(start), endDate: toISODate(addDays(start, dayCount - 1)), days }
}

