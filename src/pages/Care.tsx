import { useMemo, useState } from 'react'
import { AlertTriangle, Bell, ClipboardList, Stethoscope } from 'lucide-react'
import { runBehaviorAgent } from '@/agents/behaviorAgent'
import { getDesignerTone } from '@/agents/designerAgent'
import { runDietAgent } from '@/agents/dietAgent'
import { buildMealPlan, buildRemindersForSlot, recipeTotalMinutes } from '@/agents/mealPlanner'
import { Card, CardDesc, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { FieldHelp, FieldLabel, Input, Select, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import type { ActivityLevel, BehaviorIntake, Goal, Recipe, Reminder, Sex } from '@/domain/care'
import { requestNotificationPermission, useReminderEngine } from '@/hooks/useReminderEngine'
import { useCareStore } from '@/stores/careStore'
import { useToastStore } from '@/stores/toastStore'

function splitCsv(s: string) {
  return s
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function id() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function recipeById(recipes: Recipe[], recipeId?: string) {
  if (!recipeId) return undefined
  return recipes.find(r => r.id === recipeId)
}

export default function Care() {
  useReminderEngine()

  const tone = getDesignerTone()

  const profile = useCareStore(s => s.profile)
  const health = useCareStore(s => s.health)
  const intake = useCareStore(s => s.intake)
  const analysis = useCareStore(s => s.analysis)
  const diet = useCareStore(s => s.diet)
  const mealPlan = useCareStore(s => s.mealPlan)
  const reminders = useCareStore(s => s.reminders)
  const notificationsEnabled = useCareStore(s => s.notificationsEnabled)
  const prepLeadMinutes = useCareStore(s => s.prepLeadMinutes)
  const mealTimes = useCareStore(s => s.mealTimes)

  const setProfile = useCareStore(s => s.setProfile)
  const setHealth = useCareStore(s => s.setHealth)
  const setIntake = useCareStore(s => s.setIntake)
  const setAnalysis = useCareStore(s => s.setAnalysis)
  const setDiet = useCareStore(s => s.setDiet)
  const setMealPlan = useCareStore(s => s.setMealPlan)
  const setReminders = useCareStore(s => s.setReminders)
  const setNotificationsEnabled = useCareStore(s => s.setNotificationsEnabled)
  const setPrepLeadMinutes = useCareStore(s => s.setPrepLeadMinutes)
  const setMealTimes = useCareStore(s => s.setMealTimes)
  const resetAll = useCareStore(s => s.resetAll)

  const pushToast = useToastStore(s => s.push)

  const [conditionsText, setConditionsText] = useState(health.conditions.join(', '))
  const [allergiesText, setAllergiesText] = useState(health.allergies.join(', '))
  const [medsText, setMedsText] = useState(health.medications.join(', '))

  const [planDays, setPlanDays] = useState(7)
  const [startDateISO, setStartDateISO] = useState(todayISO())

  const derivedAllergies = useMemo(() => splitCsv(allergiesText), [allergiesText])
  const intakeFlags = useMemo(
    () =>
      [
        { key: 'vomit', label: '구토' },
        { key: 'diarrhea', label: '설사' },
        { key: 'coughSneezing', label: '기침/재채기' },
        { key: 'itching', label: '가려움' },
        { key: 'lethargy', label: '무기력' },
        { key: 'painSigns', label: '통증 징후' },
        { key: 'anxiety', label: '불안' },
      ] as const,
    [],
  )

  function setIntakeFlag(key: (typeof intakeFlags)[number]['key'], value: boolean) {
    setIntake({ [key]: value } as Pick<BehaviorIntake, typeof key>)
  }

  const filteredDiet = useMemo(() => {
    if (!diet) return null
    if (derivedAllergies.length === 0) return diet
    const blocks = derivedAllergies.map(a => a.toLowerCase())
    const recipeLibrary = diet.recipeLibrary.filter(r => {
      const s = `${r.title} ${r.ingredients.map(i => i.item).join(' ')}`.toLowerCase()
      return !blocks.some(b => b && s.includes(b))
    })
    return { ...diet, recipeLibrary }
  }, [derivedAllergies, diet])

  const canGeneratePlan = Boolean(filteredDiet?.recipeLibrary.length)

  async function handleAnalyze() {
    setHealth({
      conditions: splitCsv(conditionsText),
      allergies: splitCsv(allergiesText),
      medications: splitCsv(medsText),
    })

    const a = runBehaviorAgent({ profile, intake })
    setAnalysis(a)

    const d = runDietAgent({
      profile,
      goal: health.goal,
      conditions: splitCsv(conditionsText),
      allergies: splitCsv(allergiesText),
    })
    setDiet(d)

    pushToast({ title: '분석이 완료됐어요', body: '위급 신호가 있으면 병원이 우선입니다.', tone: 'success' })
  }

  function handleBuildPlan() {
    if (!filteredDiet || filteredDiet.recipeLibrary.length === 0) {
      pushToast({ title: '레시피가 부족해요', body: '알레르기/조건을 완화하거나 다른 레시피가 필요해요.', tone: 'warn' })
      return
    }

    const [y, m, d] = startDateISO.split('-').map(Number)
    const startDate = new Date(y, m - 1, d, 0, 0, 0, 0)

    const recipeIds = filteredDiet.recipeLibrary.map(r => r.id)
    const nextPlan = buildMealPlan({
      startDate,
      days: planDays,
      breakfastTimeHHmm: mealTimes.breakfast,
      dinnerTimeHHmm: mealTimes.dinner,
      snackTimeHHmm: mealTimes.snack,
      recipeIdsForMeals: recipeIds,
    })

    const nextReminders: Reminder[] = []
    for (const slot of nextPlan.slots) {
      const recipe = recipeById(filteredDiet.recipeLibrary, slot.recipeId)
      const lead = recipe ? Math.min(prepLeadMinutes, recipeTotalMinutes(recipe)) : prepLeadMinutes
      const r = buildRemindersForSlot({ slot, recipe, prepLeadMinutes: lead })
      if (r.prep) nextReminders.push({ id: id(), ...r.prep })
      nextReminders.push({ id: id(), ...r.meal })
    }

    setMealPlan(nextPlan)
    setReminders(nextReminders)
    pushToast({ title: '식단과 알림이 설정됐어요', body: '알림 권한을 켜면 더 편해요.', tone: 'success' })
  }

  async function handleEnableNotifications() {
    const res = await requestNotificationPermission()
    if (res === 'unsupported') {
      pushToast({ title: '이 브라우저는 알림을 지원하지 않아요', tone: 'warn' })
      return
    }
    if (res !== 'granted') {
      pushToast({ title: '알림 권한이 허용되지 않았어요', body: '설정에서 알림을 허용해 주세요.', tone: 'warn' })
      return
    }
    setNotificationsEnabled(true)
    pushToast({ title: '알림이 켜졌어요', body: '앱이 열려 있을 때 가장 안정적으로 동작해요.', tone: 'success' })
  }

  const triageBadge = analysis?.triage === 'emergency_now'
    ? { tone: 'danger' as const, label: '응급 우선' }
    : analysis?.triage === 'see_vet_soon'
      ? { tone: 'warn' as const, label: '빠른 병원 상담' }
      : { tone: 'success' as const, label: '관찰/개선' }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">맞춤 케어 자동화</CardTitle>
            <CardDesc className="mt-1">{tone.appTagline}</CardDesc>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={resetAll}>초기화</Button>
            <Button onClick={handleAnalyze}>분석하기</Button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/60 p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:ring-slate-700">
          {tone.disclaimerLong}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>1) 반려동물 정보</CardTitle>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>이름</FieldLabel>
                <Input value={profile.name} onChange={e => setProfile({ name: e.target.value })} placeholder="예: 코코" />
              </div>
              <div className="space-y-2">
                <FieldLabel>종</FieldLabel>
                <Select
                  value={profile.species}
                  onChange={e => setProfile({ species: e.target.value as 'dog' | 'cat' })}
                >
                  <option value="dog">강아지</option>
                  <option value="cat">고양이</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>품종(선택)</FieldLabel>
                <Input value={profile.breed} onChange={e => setProfile({ breed: e.target.value })} placeholder="예: 푸들" />
              </div>
              <div className="space-y-2">
                <FieldLabel>활동량</FieldLabel>
                <Select
                  value={profile.activityLevel}
                  onChange={e => setProfile({ activityLevel: e.target.value as ActivityLevel })}
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel>나이(년)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={profile.ageYears}
                  onChange={e => setProfile({ ageYears: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>체중(kg)</FieldLabel>
                <Input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={profile.weightKg}
                  onChange={e => setProfile({ weightKg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>성별</FieldLabel>
                <Select
                  value={profile.sex}
                  onChange={e => setProfile({ sex: e.target.value as Sex })}
                >
                  <option value="unknown">모름</option>
                  <option value="male">남아</option>
                  <option value="female">여아</option>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>2) 건강/목표</CardTitle>
          <div className="mt-4 grid gap-3">
            <div className="space-y-2">
              <FieldLabel hint="쉼표로 구분">기저 질환(선택)</FieldLabel>
              <Input value={conditionsText} onChange={e => setConditionsText(e.target.value)} placeholder="예: 신장, 피부, 관절" />
            </div>
            <div className="space-y-2">
              <FieldLabel hint="쉼표로 구분">알레르기/주의 식재료(선택)</FieldLabel>
              <Input value={allergiesText} onChange={e => setAllergiesText(e.target.value)} placeholder="예: 닭, 소고기" />
            </div>
            <div className="space-y-2">
              <FieldLabel hint="쉼표로 구분">복용 약/영양제(선택)</FieldLabel>
              <Input value={medsText} onChange={e => setMedsText(e.target.value)} placeholder="예: 항히스타민" />
            </div>
            <div className="space-y-2">
              <FieldLabel>이번 목표</FieldLabel>
              <Select value={health.goal} onChange={e => setHealth({ goal: e.target.value as Goal })}>
                <option value="maintenance">건강 유지</option>
                <option value="weight_loss">체중 감량</option>
                <option value="weight_gain">체중 증가</option>
                <option value="sensitive_stomach">민감한 위장</option>
                <option value="skin_coat">피부/피모</option>
                <option value="joint_support">관절</option>
                <option value="urinary_support">요로</option>
                <option value="kidney_support">신장</option>
                <option value="diabetes_support">당뇨</option>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>3) 행동/증상 입력</CardTitle>
        <CardDesc className="mt-1">자유 서술 + 체크만으로 빠르게 분석합니다.</CardDesc>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>자유 서술</FieldLabel>
            <Textarea
              value={intake.freeText}
              onChange={e => setIntake({ freeText: e.target.value })}
              placeholder="예: 오늘 산책 후 간식을 먹고 2번 토했고, 평소보다 축 처져요."
            />
            <FieldHelp>“언제/얼마나/무엇을 먹었는지/어떤 행동인지”가 들어가면 정확도가 올라가요.</FieldHelp>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>지속 기간</FieldLabel>
                <Select value={intake.duration} onChange={e => setIntake({ duration: e.target.value as BehaviorIntake['duration'] })}>
                  <option value="today">오늘 시작</option>
                  <option value="days">며칠</option>
                  <option value="weeks">몇 주</option>
                  <option value="months">몇 달</option>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel>식욕 변화</FieldLabel>
                <Select value={intake.appetiteChange} onChange={e => setIntake({ appetiteChange: e.target.value as BehaviorIntake['appetiteChange'] })}>
                  <option value="none">변화 없음</option>
                  <option value="less">감소</option>
                  <option value="more">증가</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>물 섭취 변화</FieldLabel>
                <Select value={intake.waterIntakeChange} onChange={e => setIntake({ waterIntakeChange: e.target.value as BehaviorIntake['waterIntakeChange'] })}>
                  <option value="none">변화 없음</option>
                  <option value="less">감소</option>
                  <option value="more">증가</option>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel>핵심 체크</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {intakeFlags.map(item => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between rounded-2xl bg-white/60 px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/30 dark:text-slate-200 dark:ring-slate-700"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={intake[item.key]}
                        onChange={e => setIntakeFlag(item.key, e.target.checked)}
                        className="h-4 w-4 accent-violet-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {analysis ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                4) 행동/증상 분석 결과
              </CardTitle>
              <CardDesc className="mt-1">{tone.disclaimerShort}</CardDesc>
            </div>
            <Badge tone={triageBadge.tone}>{triageBadge.label}</Badge>
          </div>

          {analysis.triage === 'emergency_now' ? (
            <div className="mt-4 rounded-2xl bg-red-50/90 p-4 ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30">
              <div className="flex items-center gap-2 text-sm font-extrabold text-red-700 dark:text-red-200">
                <AlertTriangle className="h-4 w-4" />
                {tone.emergencyBannerTitle}
              </div>
              <div className="mt-1 text-xs font-semibold text-red-700/90 dark:text-red-200/90">{tone.emergencyBannerBody}</div>
            </div>
          ) : null}

          <div className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{analysis.summary}</div>

          {analysis.redFlags.length ? (
            <div className="mt-4">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">위급/주의 신호</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysis.redFlags.map((r, i) => (
                  <Badge key={`${r}_${i}`} tone="warn">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">가능성 높은 원인</div>
              <div className="mt-3 space-y-3">
                {analysis.likelyCauses.map(c => (
                  <div key={c.title} className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{c.title}</div>
                      <Badge tone={c.confidence === 'high' ? 'success' : c.confidence === 'medium' ? 'info' : 'neutral'}>
                        {c.confidence === 'high' ? '높음' : c.confidence === 'medium' ? '중간' : '낮음'}
                      </Badge>
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {c.why.map((w, i) => (
                        <li key={`${c.title}_${i}`}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">추가로 확인하면 좋은 질문</div>
              <ul className="mt-3 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {analysis.nextQuestions.map((q, i) => (
                  <li key={`${q}_${i}`}>{q}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {[
              { title: '지금(바로)', items: analysis.improvementPlan.now },
              { title: '24시간 내', items: analysis.improvementPlan.next24h },
              { title: '루틴 개선', items: analysis.improvementPlan.routine },
              { title: '심리 안정', items: analysis.improvementPlan.mindStability },
            ].map(sec => (
              <div key={sec.title} className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{sec.title}</div>
                <ul className="mt-3 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {sec.items.map((it, i) => (
                    <li key={`${sec.title}_${i}`}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-50">
              <ClipboardList className="h-4 w-4" />
              병원 방문 체크리스트
            </div>
            <ul className="mt-3 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {analysis.vetVisitChecklist.map((it, i) => (
                <li key={`${it}_${i}`}>{it}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {filteredDiet ? (
        <Card>
          <CardTitle>5) 생애주기·건강상태 기반 식습관 컨설팅</CardTitle>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">핵심 가이드</div>
                <Badge tone="info">추정 {filteredDiet.dailyCaloriesEstimate} kcal/일</Badge>
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredDiet.feedingGuidance.map((g, i) => (
                  <li key={`${g}_${i}`}>{g}</li>
                ))}
              </ul>
              <div className="mt-4 text-sm font-extrabold text-slate-900 dark:text-slate-50">간식 규칙</div>
              <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredDiet.treatRules.map((g, i) => (
                  <li key={`${g}_${i}`}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">식단 전환(새 사료/레시피)</div>
              <ul className="mt-3 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredDiet.transitionPlan.map((g, i) => (
                  <li key={`${g}_${i}`}>{g}</li>
                ))}
              </ul>
              <div className="mt-4 text-sm font-extrabold text-slate-900 dark:text-slate-50">주의</div>
              <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredDiet.cautionNotes.map((g, i) => (
                  <li key={`${g}_${i}`}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">추천 레시피</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                알레르기 필터 적용: {derivedAllergies.length ? derivedAllergies.join(', ') : '없음'}
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {filteredDiet.recipeLibrary.map(r => (
                <div key={r.id} className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{r.title}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        준비 {r.prepMinutes}분 · 조리 {r.cookMinutes}분 · 총 {r.prepMinutes + r.cookMinutes}분
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.tags.slice(0, 3).map(t => (
                        <Badge key={t} tone="neutral">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-extrabold text-slate-900 dark:text-slate-50">재료</div>
                  <ul className="mt-2 list-disc pl-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {r.ingredients.map((it, i) => (
                      <li key={`${r.id}_ing_${i}`}>
                        {it.item}: {it.amount}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-xs font-extrabold text-slate-900 dark:text-slate-50">만드는 법</div>
                  <ol className="mt-2 list-decimal pl-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {r.steps.map((s, i) => (
                      <li key={`${r.id}_step_${i}`}>{s}</li>
                    ))}
                  </ol>
                  {r.notes.length ? (
                    <div className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700">
                      {r.notes.join(' ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {filteredDiet ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>6) 기간별 식단 + 조리시간 기반 알림</CardTitle>
              <CardDesc className="mt-1">식사 시간 전(준비)과 식사/간식 시간에 알림을 보냅니다.</CardDesc>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setNotificationsEnabled(false)} disabled={!notificationsEnabled}>
                알림 끄기
              </Button>
              <Button variant="secondary" onClick={handleEnableNotifications}>
                <Bell className="h-4 w-4" />
                알림 켜기
              </Button>
              <Button onClick={handleBuildPlan} disabled={!canGeneratePlan}>
                식단/알림 생성
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">기간/시간 설정</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>기간</FieldLabel>
                  <Select value={String(planDays)} onChange={e => setPlanDays(Number(e.target.value))}>
                    <option value="7">7일</option>
                    <option value="14">14일</option>
                    <option value="30">30일</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel>시작일</FieldLabel>
                  <Input type="date" value={startDateISO} onChange={e => setStartDateISO(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <FieldLabel>아침</FieldLabel>
                  <Input type="time" value={mealTimes.breakfast} onChange={e => setMealTimes({ breakfast: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <FieldLabel>저녁</FieldLabel>
                  <Input type="time" value={mealTimes.dinner} onChange={e => setMealTimes({ dinner: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="선택">간식</FieldLabel>
                  <Input
                    type="time"
                    value={mealTimes.snack ?? ''}
                    onChange={e => setMealTimes({ snack: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="분">준비 알림 리드타임</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={prepLeadMinutes}
                    onChange={e => setPrepLeadMinutes(Number(e.target.value))}
                  />
                  <FieldHelp>레시피 조리시간이 더 짧으면 자동으로 그 시간만큼 앞당겨요.</FieldHelp>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">알림 상태</div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl bg-white/70 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold">현재</div>
                    <Badge tone={notificationsEnabled ? 'success' : 'neutral'}>{notificationsEnabled ? 'ON' : 'OFF'}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    브라우저 알림은 권한이 필요하고, 기기/브라우저 정책에 따라 백그라운드에서 제한될 수 있어요.
                  </div>
                </div>
                <div className="rounded-2xl bg-white/70 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-700">
                  <div className="font-extrabold">설정된 알림 개수</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{reminders.length}개</div>
                </div>
              </div>
            </div>
          </div>

          {mealPlan && filteredDiet ? (
            <div className="mt-5 rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">식단 미리보기</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2 pr-3">날짜</th>
                      <th className="py-2 pr-3">종류</th>
                      <th className="py-2 pr-3">시간</th>
                      <th className="py-2 pr-3">레시피</th>
                      <th className="py-2 pr-3">예상 시간</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {mealPlan.slots.map((s, i) => {
                      const recipe = recipeById(filteredDiet.recipeLibrary, s.recipeId)
                      const minutes = recipe ? recipeTotalMinutes(recipe) : null
                      return (
                        <tr key={`${s.dateISO}_${s.kind}_${i}`} className={cn(i % 2 === 0 && 'bg-white/40 dark:bg-slate-900/30')}>
                          <td className="py-2 pr-3">{s.dateISO}</td>
                          <td className="py-2 pr-3">{s.kind === 'breakfast' ? '아침' : s.kind === 'dinner' ? '저녁' : '간식'}</td>
                          <td className="py-2 pr-3 tabular-nums">{s.timeHHmm}</td>
                          <td className="py-2 pr-3">{recipe ? recipe.title : s.kind === 'snack' ? '간식(소량)' : '-'}</td>
                          <td className="py-2 pr-3">{minutes != null ? `${minutes}분` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
