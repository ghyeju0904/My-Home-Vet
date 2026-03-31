import type { MealPlan, MealSlot, Recipe } from '@/domain/care'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function dateISO(d: Date) {
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  return `${yyyy}-${mm}-${dd}`
}

export function recipeTotalMinutes(recipe: Recipe) {
  return recipe.prepMinutes + recipe.cookMinutes
}

export function buildMealPlan(args: {
  startDate: Date
  days: number
  breakfastTimeHHmm: string
  dinnerTimeHHmm: string
  snackTimeHHmm?: string
  recipeIdsForMeals: string[]
}): MealPlan {
  const slots: MealSlot[] = []
  const days = Math.max(1, Math.min(31, args.days))

  for (let i = 0; i < days; i++) {
    const d = new Date(args.startDate)
    d.setDate(d.getDate() + i)
    const iso = dateISO(d)
    const recipeId = args.recipeIdsForMeals[i % args.recipeIdsForMeals.length]

    slots.push({ dateISO: iso, kind: 'breakfast', timeHHmm: args.breakfastTimeHHmm, recipeId })
    slots.push({ dateISO: iso, kind: 'dinner', timeHHmm: args.dinnerTimeHHmm, recipeId })

    if (args.snackTimeHHmm) {
      slots.push({ dateISO: iso, kind: 'snack', timeHHmm: args.snackTimeHHmm })
    }
  }

  return {
    startDateISO: dateISO(args.startDate),
    days,
    slots,
  }
}

export function toEpochMs(dateISO: string, timeHHmm: string) {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [hh, mm] = timeHHmm.split(':').map(Number)
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0)
  return dt.getTime()
}

export function buildRemindersForSlot(args: {
  slot: MealSlot
  recipe?: Recipe
  prepLeadMinutes: number
}): { prep?: { fireAt: number; title: string; body: string }; meal: { fireAt: number; title: string; body: string } } {
  const mealAt = toEpochMs(args.slot.dateISO, args.slot.timeHHmm)
  const kindKo = args.slot.kind === 'breakfast' ? '아침' : args.slot.kind === 'dinner' ? '저녁' : '간식'

  const meal = {
    fireAt: mealAt,
    title: `${kindKo} 시간이에요`,
    body: args.slot.kind === 'snack' ? '간식은 소량, 칭찬은 듬뿍!' : '규칙적인 식사가 건강을 지켜요.',
  }

  if (!args.recipe || args.slot.kind === 'snack') return { meal }

  const prepAt = mealAt - args.prepLeadMinutes * 60 * 1000
  return {
    prep: {
      fireAt: prepAt,
      title: `${kindKo} 준비 시작`,
      body: `${args.recipe.title} (예상 ${args.recipe.prepMinutes + args.recipe.cookMinutes}분)`,
    },
    meal,
  }
}
