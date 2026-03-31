import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import type { Pet } from '@/lib/types'
import { buildDietPlan } from '@/lib/dietEngine'
import { getDeviceId } from '@/lib/device'

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function plusDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function isoToDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

export default function DietConsulting() {
  const { pushToast } = useToast()
  const [pets, setPets] = useState<Pet[]>([])
  const [petId, setPetId] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(plusDaysISO(6))
  const [plan, setPlan] = useState<ReturnType<typeof buildDietPlan> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('pets')
      .select('*')
      .eq('device_id', getDeviceId())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const list = (data as Pet[]) ?? []
        setPets(list)
        if (!petId && list[0]) setPetId(list[0].id)
      })
  }, [])

  const selectedPet = useMemo(() => pets.find((p) => p.id === petId) ?? null, [pets, petId])

  const generate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPet) {
      pushToast({ title: '반려동물을 먼저 등록해 주세요.', variant: 'warning' })
      return
    }

    const next = buildDietPlan(selectedPet, startDate, endDate)
    setPlan(next)
    pushToast({ title: '식단 생성 완료', message: '마음에 들면 저장하고 알림을 만들 수 있어요.', variant: 'success' })
  }

  const saveAndSchedule = async () => {
    if (!selectedPet || !plan) return
    setSaving(true)

    const { data: inserted, error: dietError } = await supabase
      .from('diet_plans')
      .insert({ device_id: getDeviceId(), pet_id: selectedPet.id, start_date: plan.startDate, end_date: plan.endDate, plan })
      .select('id')
      .single()

    if (dietError) {
      setSaving(false)
      pushToast({ title: '저장 실패', message: dietError.message, variant: 'danger' })
      return
    }

    const notifications: Array<{ device_id: string; user_id: string | null; type: string; title: string; content: string; scheduled_at: string; data: unknown }> = []

    for (const day of plan.days) {
      for (const meal of [...day.meals, ...day.snacks]) {
        const eatAt = isoToDateTime(day.date, meal.time)
        const prepAt = new Date(eatAt.getTime() - meal.estCookMinutes * 60 * 1000)

        if (meal.estCookMinutes > 0) {
          notifications.push({
            device_id: getDeviceId(),
            user_id: null,
            type: 'meal-prep',
            title: '식사 준비 시작',
            content: `${selectedPet.name} ${meal.title} 준비를 시작해요 (예상 ${meal.estCookMinutes}분).`,
            scheduled_at: prepAt.toISOString(),
            data: { petId: selectedPet.id, dietPlanId: inserted.id, date: day.date, time: meal.time, kind: 'prep' },
          })
        }

        notifications.push({
          device_id: getDeviceId(),
          user_id: null,
          type: meal.title.includes('간식') ? 'snack' : 'meal',
          title: '식사 시간',
          content: `${selectedPet.name} ${meal.title} 시간이에요. 규칙적으로 급여해 주세요.`,
          scheduled_at: eatAt.toISOString(),
          data: { petId: selectedPet.id, dietPlanId: inserted.id, date: day.date, time: meal.time, kind: 'eat' },
        })
      }
    }

    const { error: nError } = await supabase.from('notifications').insert(notifications)
    setSaving(false)
    if (nError) {
      pushToast({ title: '알림 생성 실패', message: nError.message, variant: 'danger' })
      return
    }

    pushToast({ title: '저장 완료', message: '알림 센터에서 전체 일정을 확인할 수 있어요.', variant: 'success' })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-lg font-semibold text-slate-900">식단 컨설팅</div>
        <div className="mt-1 text-sm text-slate-700">생애주기/알레르기 정보 기반으로 기간별 식단을 만들고 알림까지 연결해요.</div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <form onSubmit={generate} className="grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-slate-700">반려동물</div>
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              disabled={pets.length === 0}
            >
              {pets.length === 0 ? <option value="">먼저 반려동물을 등록해 주세요</option> : null}
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-700">시작일</div>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold text-slate-700">종료일</div>
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>

          <div className="md:col-span-4">
            <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              식단 생성
            </button>
          </div>
        </form>
      </section>

      {plan ? (
        <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">기간별 식단</div>
              <div className="text-xs text-slate-600">
                {plan.startDate} ~ {plan.endDate}
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAndSchedule()}
              className="rounded-2xl bg-[#A8E6CF]/40 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {saving ? '저장 중...' : '저장 + 알림 만들기'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {plan.days.map((d) => (
              <div key={d.date} className="rounded-2xl border border-white bg-white/60 p-4">
                <div className="text-sm font-semibold text-slate-900">{d.date}</div>
                {d.notes.length > 0 ? <div className="mt-1 text-xs text-slate-600">{d.notes.join(' ')} </div> : null}
                <div className="mt-3 space-y-2">
                  {[...d.meals, ...d.snacks].map((m) => (
                    <div key={`${m.time}-${m.title}`} className="rounded-2xl border border-white bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                        <div className="text-xs text-slate-600">
                          {m.time}
                          {m.estCookMinutes > 0 ? ` · ${m.estCookMinutes}분` : ''}
                        </div>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {m.recipe.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-600">
            식단은 참고용이며, 기저질환/약 복용 중이면 수의사 상담을 우선 권장해요.
          </div>
        </section>
      ) : null}
    </div>
  )
}
