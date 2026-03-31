import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AlarmClock,
  BadgeCheck,
  Bone,
  Brain,
  CalendarDays,
  Cat,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Dog,
  HeartPulse,
  LineChart,
  PawPrint,
  ShieldAlert,
  Sparkles,
  Utensils,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Species = "dog" | "cat" | "other"
type Sex = "male" | "female" | "unknown"
type Likelihood = "높음" | "중간" | "낮음"
type TriageLevel = "응급" | "긴급" | "비응급"
type TabKey = "care" | "meal" | "game"

type PetProfile = {
  name: string
  species: Species
  breed: string
  sex: Sex
  neutered: "yes" | "no" | "unknown"
  ageYears: number
  weightKg: number
  conditions: string[]
  allergies: string
}

type SymptomInput = {
  freeText: string
  startedWhen: string
  frequency: string
  severity: "경미" | "보통" | "심함"
  check: {
    breathingDifficulty: boolean
    seizure: boolean
    collapse: boolean
    uncontrolledBleeding: boolean
    repeatedVomiting: boolean
    vomitingBlood: boolean
    diarrheaBlood: boolean
    veryLethargic: boolean
    notEating24h: boolean
    abdominalDistensionPain: boolean
    limping: boolean
    itching: boolean
    coughing: boolean
    urinationIssue: boolean
    aggression: boolean
    separationAnxiety: boolean
    inappropriateElimination: boolean
  }
}

type CauseHypothesis = {
  title: string
  likelihood: Likelihood
  why: string[]
  category: "의학" | "행동" | "환경"
}

type ActionItem = {
  title: string
  detail: string
  category: "즉시" | "환경" | "훈련" | "관찰" | "식이"
}

type AnalysisResult = {
  triage: { level: TriageLevel; reasons: string[]; next: string[] }
  causes: CauseHypothesis[]
  actions: ActionItem[]
  vetSummary: string[]
  redFlags: string[]
}

type MealScheduleInput = {
  mealsPerDay: 1 | 2 | 3
  mealTimes: string[]
  snackTimes: string[]
  prepMinutes: number
  cookMinutes: number
  coolMinutes: number
  durationDays: 7 | 14 | 30
  startDate: string
  recipeStyle: "기성식 중심" | "간단 레시피"
}

type ReminderItem = {
  id: string
  atIso: string
  kind: "prep" | "meal" | "snack"
  title: string
  body: string
}

type GameOption = {
  id: string
  label: string
  outcomeTitle: string
  outcomeBody: string
  scoreDelta: number
  isBest: boolean
}

type GameScenario = {
  id: string
  title: string
  situation: string
  options: GameOption[]
  learningPoint: string
}

const STORAGE_KEY = "petcare:mvp:v1"

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function normalizeText(s: string) {
  return (s ?? "").trim()
}

function dedupeNonEmpty(items: string[]) {
  const set = new Set(items.map((x) => normalizeText(x)).filter(Boolean))
  return Array.from(set)
}

function formatSpeciesLabel(species: Species) {
  if (species === "dog") return "강아지"
  if (species === "cat") return "고양이"
  return "기타"
}

function computeLifeStage(species: Species, ageYears: number) {
  if (ageYears < 1) return "성장기"
  if (species === "cat") {
    if (ageYears >= 11) return "노령"
    if (ageYears >= 7) return "중년"
    return "성년"
  }
  if (species === "dog") {
    if (ageYears >= 9) return "노령"
    if (ageYears >= 6) return "중년"
    return "성년"
  }
  if (ageYears >= 9) return "노령"
  if (ageYears >= 6) return "중년"
  return "성년"
}

function buildTriage(profile: PetProfile, input: SymptomInput) {
  const reasons: string[] = []
  const next: string[] = []
  const redFlags: string[] = []

  const text = normalizeText(input.freeText).toLowerCase()
  const textHas = (words: string[]) => words.some((w) => text.includes(w))

  const emergency =
    input.check.breathingDifficulty ||
    input.check.seizure ||
    input.check.collapse ||
    input.check.uncontrolledBleeding ||
    input.check.vomitingBlood ||
    input.check.diarrheaBlood ||
    input.check.abdominalDistensionPain

  const urgent =
    input.check.repeatedVomiting ||
    input.check.veryLethargic ||
    input.check.notEating24h ||
    input.check.urinationIssue ||
    textHas(["경련", "호흡", "피", "실신", "복부 팽만", "복통", "숨", "가쁜"])

  if (emergency) {
    reasons.push("응급 신호(호흡/의식/출혈/혈변·혈토/심한 복부 통증·팽만)가 포함돼요.")
    next.push("가능하면 즉시 24시 응급 동물병원에 전화 후 내원해요.")
    next.push("이동 중에는 과도한 억지 급여/투약을 피하고, 호흡·의식 상태를 우선 확인해요.")
    redFlags.push("호흡 곤란/혀·잇몸이 파랗게 보임")
    redFlags.push("경련, 의식 저하, 쓰러짐")
    redFlags.push("멈추지 않는 출혈")
    redFlags.push("혈변/혈토, 커피색 구토")
    redFlags.push("갑작스러운 배 팽만 + 구역질(특히 대형견)")
  } else if (urgent) {
    reasons.push("악화 가능성이 있는 신호(반복 구토/무기력/식욕부진/배뇨 문제 등)가 보여요.")
    next.push("가능하면 오늘 안에 병원 상담/내원을 우선 고려해요.")
    next.push("증상 시작 시점, 빈도, 식사·간식, 환경 변화, 영상/사진을 기록해요.")
    redFlags.push("증상이 갑자기 심해지거나 반복될 때")
    redFlags.push("물도 못 마시거나 토할 때")
    redFlags.push("소변을 못 보거나 통증이 심해질 때")
  } else {
    reasons.push("현재 입력만으로는 즉시 응급 신호는 낮아 보여요.")
    next.push("관찰 포인트를 기록하면서 환경/루틴을 안정화해요.")
    next.push("48시간 내 호전이 없거나 악화 시 병원 상담을 권장해요.")
    redFlags.push("무기력/식욕 저하가 24시간 이상 지속될 때")
    redFlags.push("구토·설사가 반복되거나 피가 보일 때")
  }

  const extraSafety: string[] = []
  if (profile.species === "cat" && textHas(["숨", "호흡", "헐떡"])) {
    extraSafety.push("고양이의 헐떡임/호흡 이상은 긴급일 수 있어요.")
  }
  if (extraSafety.length) reasons.push(...extraSafety)

  const level: TriageLevel = emergency ? "응급" : urgent ? "긴급" : "비응급"
  return { level, reasons: dedupeNonEmpty(reasons), next: dedupeNonEmpty(next), redFlags: dedupeNonEmpty(redFlags) }
}

function buildHypotheses(profile: PetProfile, input: SymptomInput): CauseHypothesis[] {
  const causes: CauseHypothesis[] = []
  const t = normalizeText(input.freeText).toLowerCase()
  const has = (words: string[]) => words.some((w) => t.includes(w))

  const add = (c: CauseHypothesis) => {
    causes.push(c)
  }

  if (input.check.itching || has(["가려", "긁", "핥", "피부", "귀"])) {
    add({
      title: "피부/알레르기(환경·식이) 또는 외부기생충",
      likelihood: "높음",
      why: ["가려움/긁음/핥기/귀 불편이 보고돼요.", "계절·세제·사료/간식 변화가 촉발 요인이 될 수 있어요."],
      category: "의학",
    })
  }

  if (input.check.separationAnxiety || has(["혼자", "분리", "불안", "외출", "문 앞", "파괴"])) {
    add({
      title: "분리불안/예측 불가능한 루틴에 의한 스트레스",
      likelihood: "높음",
      why: ["혼자 있을 때 불안 행동이 나타난다고 했어요.", "루틴 변화·운동량 부족·강화(관심)로 유지될 수 있어요."],
      category: "행동",
    })
  }

  if (input.check.aggression || has(["물", "공격", "으르렁", "입질"])) {
    add({
      title: "두려움/통증/자원수비 기반 공격성",
      likelihood: "중간",
      why: ["공격성은 공포·통증·자원 경쟁 등 다양한 원인이 있어요.", "특정 상황(만짐/밥/장난감/낯선 사람)에서 패턴이 중요해요."],
      category: "행동",
    })
  }

  if (input.check.repeatedVomiting || has(["구토", "토", "설사", "복통", "먹을 걸 주워"])) {
    add({
      title: "위장관 문제(식이 변화/이물/감염/염증)",
      likelihood: input.check.repeatedVomiting ? "높음" : "중간",
      why: ["구토/설사/복부 불편은 식이 변화·이물 섭취·감염 등에서 흔해요.", "반복/무기력 동반 시 내원 우선이에요."],
      category: "의학",
    })
  }

  if (input.check.coughing || has(["기침", "켁켁", "가래", "숨", "호흡"])) {
    add({
      title: "호흡기/심장성 문제 또는 기관지 자극",
      likelihood: input.check.breathingDifficulty ? "높음" : "중간",
      why: ["기침은 감염성·알레르기·심장/기관 문제 등 원인이 다양해요.", "호흡 곤란이 있으면 응급 평가가 필요해요."],
      category: "의학",
    })
  }

  if (input.check.urinationIssue || has(["소변", "오줌", "자주", "못 싸", "피오줌", "화장실"])) {
    add({
      title: "요로 문제(방광염/결석/폐색 위험)",
      likelihood: "높음",
      why: ["배뇨 문제는 악화 시 급성 폐색 등 응급으로 진행할 수 있어요.", "특히 수컷 고양이는 소변을 못 보면 즉시 내원이 필요해요."],
      category: "의학",
    })
  }

  if (input.check.inappropriateElimination || has(["실수", "배변", "화장실", "마킹", "침대"])) {
    add({
      title: "배변/배뇨 실수: 의료적 원인 + 환경(화장실/스트레스) 복합",
      likelihood: "중간",
      why: ["통증/요로 문제, 화장실 선호, 스트레스가 함께 작용할 수 있어요.", "의학적 문제 배제 후 환경 최적화가 효과적이에요."],
      category: "환경",
    })
  }

  if (!causes.length) {
    add({
      title: "정보가 더 필요해요(패턴 기반 평가 권장)",
      likelihood: "중간",
      why: ["증상/행동의 발생 상황(언제, 무엇 직후, 얼마나 자주)이 원인 추정에 핵심이에요."],
      category: "환경",
    })
  }

  return causes.slice(0, 5)
}

function buildActions(profile: PetProfile, input: SymptomInput, triage: ReturnType<typeof buildTriage>, causes: CauseHypothesis[]) {
  const actions: ActionItem[] = []

  if (triage.level === "응급") {
    actions.push({
      title: "즉시 내원 준비",
      detail: "증상 영상/사진, 섭취한 음식·간식·이물, 복용 중 약/보조제 목록을 챙겨요.",
      category: "즉시",
    })
    actions.push({
      title: "안전 확보",
      detail: "과도한 억지 급여/투약은 피하고, 호흡·의식 상태를 우선 확인해요.",
      category: "즉시",
    })
    return actions
  }

  const hasMedical = causes.some((c) => c.category === "의학")

  actions.push({
    title: "관찰 기록(48시간)",
    detail: "언제/얼마나/무엇 직후 발생했는지, 식사·간식·배변·수면 변화를 짧게 기록해요.",
    category: "관찰",
  })

  if (hasMedical) {
    actions.push({
      title: "식이·간식 단순화",
      detail: "새 간식/사료/영양제는 잠시 중단하고, 기존에 잘 맞던 식단으로 2~3일 안정화해요.",
      category: "식이",
    })
  }

  if (input.check.itching) {
    actions.push({
      title: "피부 자극 줄이기",
      detail: "산책 후 미지근한 물로 발/하복부를 가볍게 닦고, 향 강한 세제·방향제 노출을 줄여요.",
      category: "환경",
    })
  }

  if (input.check.separationAnxiety) {
    actions.push({
      title: "분리 연습(짧게, 자주)",
      detail: "외출 전후 과도한 인사/위로를 줄이고, 30초~2분부터 점진적으로 시간을 늘려요.",
      category: "훈련",
    })
    actions.push({
      title: "예측 가능한 루틴",
      detail: "산책/놀이/식사 시간을 일정하게 하고, 혼자 있을 때 사용할 노즈워크/장난감을 준비해요.",
      category: "환경",
    })
  }

  if (profile.species === "cat") {
    actions.push({
      title: "고양이 환경 점검",
      detail: "화장실 수=고양이 수+1, 은신처/수직공간/스크래처를 확보해 스트레스를 낮춰요.",
      category: "환경",
    })
  }

  actions.push({
    title: "악화 신호 체크",
    detail: "무기력, 반복 구토/설사, 호흡 이상, 배뇨 불가, 혈변/혈토가 있으면 즉시 병원 상담해요.",
    category: "즉시",
  })

  return actions.slice(0, 8)
}

function buildVetSummary(profile: PetProfile, input: SymptomInput) {
  const list: string[] = []
  list.push(`환자: ${normalizeText(profile.name) || "미기입"} (${formatSpeciesLabel(profile.species)})`)
  list.push(`품종: ${normalizeText(profile.breed) || "미기입"} / 성별: ${profile.sex} / 중성화: ${profile.neutered}`)
  list.push(`나이: ${profile.ageYears || 0}세 / 체중: ${profile.weightKg || 0}kg`)
  if (profile.conditions.length) list.push(`기저질환: ${profile.conditions.join(", ")}`)
  if (normalizeText(profile.allergies)) list.push(`알레르기/주의: ${normalizeText(profile.allergies)}`)
  list.push(`주호소: ${normalizeText(input.freeText) || "미기입"}`)
  if (normalizeText(input.startedWhen)) list.push(`시작 시점: ${normalizeText(input.startedWhen)}`)
  if (normalizeText(input.frequency)) list.push(`빈도: ${normalizeText(input.frequency)} / 강도: ${input.severity}`)
  return list
}

function buildDietAdvice(profile: PetProfile, input: SymptomInput) {
  const lifeStage = computeLifeStage(profile.species, profile.ageYears)
  const bullets: string[] = []
  const cautions: string[] = []

  bullets.push(`${lifeStage} 기준으로 식단은 “완전균형(complete & balanced)”이 우선이에요.`)
  bullets.push("간식은 하루 총칼로리의 10% 이내로 제한하고, 보상은 장난/칭찬으로 분산해요.")
  bullets.push("수분 섭취를 늘리면 요로/변 상태에 도움이 될 수 있어요(특히 고양이).")

  if (profile.conditions.some((c) => c.includes("신장") || c.includes("요로"))) {
    cautions.push("신장/요로 이력이 있으면 임의 자연식/고단백 식단 변경은 피하고 병원 상담을 우선해요.")
  }
  if (profile.conditions.some((c) => c.includes("췌장") || c.includes("췌장염"))) {
    cautions.push("췌장 이력이 있으면 고지방 간식(치즈, 지방 많은 육류)은 피하는 게 안전해요.")
  }
  if (input.check.itching) {
    bullets.push("가려움이 있다면 단백질/간식 종류를 단순화하고, 새 간식은 2주 이상 추가하지 않는 게 좋아요.")
  }

  if (profile.species === "cat") {
    bullets.push("고양이는 특정 영양소(타우린 등)가 필수라 임의 레시피 식단은 위험할 수 있어요.")
  }

  return { lifeStage, bullets: dedupeNonEmpty(bullets), cautions: dedupeNonEmpty(cautions) }
}

function safeRecipesFor(profile: PetProfile, style: MealScheduleInput["recipeStyle"]) {
  if (style === "기성식 중심") {
    if (profile.species === "cat") {
      return [
        { name: "습식 캔 + 미지근한 물 섞기", prep: 2, cook: 0, cool: 0, steps: ["습식을 준비해요.", "미지근한 물을 1~2스푼 섞어 향과 수분을 올려요.", "급여 후 잔반은 바로 치워요."] },
        { name: "건식 + 퍼즐피더(느린 급여)", prep: 3, cook: 0, cool: 0, steps: ["평소 건식을 준비해요.", "퍼즐피더/노즈워크 매트에 나눠 담아 천천히 먹게 해요."] },
      ]
    }
    return [
      { name: "건식 + 슬로우피더", prep: 3, cook: 0, cool: 0, steps: ["평소 사료를 준비해요.", "슬로우피더에 담아 과식/급식을 줄여요."] },
      { name: "습식 파우치 + 물 섞기", prep: 2, cook: 0, cool: 0, steps: ["습식 파우치를 준비해요.", "물 1~3스푼을 섞어 수분을 보강해요."] },
    ]
  }

  if (profile.species === "cat") {
    return [
      { name: "습식 워밍(전자레인지 5~8초)", prep: 2, cook: 1, cool: 1, steps: ["완전균형 습식을 준비해요.", "아주 짧게 워밍 후 뜨겁지 않은지 확인해요.", "물 1~2스푼을 섞어 수분을 보강해요."] },
    ]
  }

  return [
    {
      name: "강아지용 간단 토핑(단호박+물)",
      prep: 5,
      cook: 8,
      cool: 8,
      steps: ["단호박을 작게 썰어 물에 부드럽게 익혀요.", "충분히 식힌 뒤 사료 위에 1~2스푼만 토핑해요.", "처음 급여 시에는 소량으로 시작해요."],
    },
  ]
}

function buildReminders(profile: PetProfile, schedule: MealScheduleInput) {
  const startDate = schedule.startDate ? new Date(`${schedule.startDate}T00:00:00`) : new Date()
  const days = schedule.durationDays
  const items: ReminderItem[] = []

  const mkIso = (d: Date) => d.toISOString()
  const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60000)

  const createReminder = (at: Date, kind: ReminderItem["kind"], title: string, body: string) => {
    items.push({ id: `${kind}:${at.getTime()}`, atIso: mkIso(at), kind, title, body })
  }

  const recipe = safeRecipesFor(profile, schedule.recipeStyle)[0]
  const prepTotal = schedule.prepMinutes + schedule.cookMinutes + schedule.coolMinutes
  const defaultPrepTotal = recipe.prep + recipe.cook + recipe.cool
  const prepMinutes = schedule.recipeStyle === "간단 레시피" ? (prepTotal ? prepTotal : defaultPrepTotal) : schedule.prepMinutes

  for (let i = 0; i < days; i++) {
    const day = new Date(startDate.getTime() + i * 24 * 60 * 60000)

    for (const time of schedule.mealTimes.slice(0, schedule.mealsPerDay)) {
      const [hRaw, mRaw] = time.split(":")
      const h = clampNumber(Number(hRaw), 0, 23)
      const m = clampNumber(Number(mRaw), 0, 59)
      const mealAt = new Date(day)
      mealAt.setHours(h, m, 0, 0)

      if (schedule.recipeStyle === "간단 레시피") {
        const prepAt = addMinutes(mealAt, -prepMinutes)
        createReminder(prepAt, "prep", "식사 준비 시작", `${recipe.name} · 예상 ${prepMinutes}분 (준비+조리+식힘 포함)`)
      } else if (schedule.prepMinutes > 0) {
        const prepAt = addMinutes(mealAt, -schedule.prepMinutes)
        createReminder(prepAt, "prep", "식사 준비 시작", `식사 ${schedule.prepMinutes}분 전 준비를 시작해요.`)
      }

      createReminder(mealAt, "meal", "식사 시간", `${normalizeText(profile.name) || "반려동물"} 식사 시간이에요.`)
    }

    for (const time of schedule.snackTimes) {
      if (!normalizeText(time)) continue
      const [hRaw, mRaw] = time.split(":")
      const h = clampNumber(Number(hRaw), 0, 23)
      const m = clampNumber(Number(mRaw), 0, 59)
      const snackAt = new Date(day)
      snackAt.setHours(h, m, 0, 0)
      createReminder(snackAt, "snack", "간식/보상 시간", "간식은 소량, 가능하면 장난/칭찬으로 대체도 좋아요.")
    }
  }

  const now = Date.now()
  return items
    .filter((x) => new Date(x.atIso).getTime() >= now - 60000)
    .sort((a, b) => new Date(a.atIso).getTime() - new Date(b.atIso).getTime())
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function Card(props: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur", props.className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">{props.icon}</div>
          <h2 className="text-base font-semibold text-slate-900">{props.title}</h2>
        </div>
      </div>
      {props.children}
    </section>
  )
}

function Chip(props: { label: string; tone?: "neutral" | "danger" | "good" | "warn" }) {
  const tone = props.tone ?? "neutral"
  const cls =
    tone === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : tone === "good"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : tone === "warn"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cls)}>{props.label}</span>
}

function FieldLabel(props: { label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-slate-800">{props.label}</span>
      {props.hint ? <span className="text-xs text-slate-500">{props.hint}</span> : null}
    </div>
  )
}

function CheckboxRow(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  )
}

function PrimaryButton(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) {
  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400",
        props.className,
      )}
    >
      {props.children}
    </button>
  )
}

function GhostButton(props: { children: ReactNode; onClick?: () => void; className?: string; type?: "button" | "submit" }) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      className={cn("inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50", props.className)}
    >
      {props.children}
    </button>
  )
}

function createDefaultState() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  const profile: PetProfile = {
    name: "",
    species: "dog",
    breed: "",
    sex: "unknown",
    neutered: "unknown",
    ageYears: 3,
    weightKg: 5,
    conditions: [],
    allergies: "",
  }

  const symptoms: SymptomInput = {
    freeText: "",
    startedWhen: "",
    frequency: "",
    severity: "보통",
    check: {
      breathingDifficulty: false,
      seizure: false,
      collapse: false,
      uncontrolledBleeding: false,
      repeatedVomiting: false,
      vomitingBlood: false,
      diarrheaBlood: false,
      veryLethargic: false,
      notEating24h: false,
      abdominalDistensionPain: false,
      limping: false,
      itching: false,
      coughing: false,
      urinationIssue: false,
      aggression: false,
      separationAnxiety: false,
      inappropriateElimination: false,
    },
  }

  const meals: MealScheduleInput = {
    mealsPerDay: 2,
    mealTimes: ["08:30", "18:30", "21:00"],
    snackTimes: ["14:30"],
    prepMinutes: 15,
    cookMinutes: 10,
    coolMinutes: 10,
    durationDays: 7,
    startDate: `${yyyy}-${mm}-${dd}`,
    recipeStyle: "기성식 중심",
  }

  return { profile, symptoms, meals }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReturnType<typeof createDefaultState>
  } catch {
    return null
  }
}

function saveState(state: ReturnType<typeof createDefaultState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}

const CONDITIONS_PRESET = ["비만", "신장", "요로", "피부", "장", "심장", "췌장", "치아", "관절"]

const GAME_SCENARIOS: GameScenario[] = [
  {
    id: "chocolate",
    title: "초콜릿을 먹었어요",
    situation: "강아지가 바닥에 떨어진 초콜릿을 먹었어요. 지금은 멀쩡해 보여요.",
    learningPoint: "독성 식품(초콜릿, 자일리톨 등)은 증상 전이라도 위험해요. 빠른 상담이 핵심이에요.",
    options: [
      {
        id: "wait",
        label: "지켜본다(내일 병원)",
        outcomeTitle: "위험할 수 있어요",
        outcomeBody: "독성은 시간이 지나며 증상이 진행할 수 있어요. 빠른 상담이 더 안전해요.",
        scoreDelta: -2,
        isBest: false,
      },
      {
        id: "call",
        label: "바로 응급/병원에 전화하고 섭취량을 공유한다",
        outcomeTitle: "가장 안전한 선택",
        outcomeBody: "섭취량/시간/체중에 따라 조치가 달라요. 전화 후 안내를 따르는 게 좋아요.",
        scoreDelta: 3,
        isBest: true,
      },
      {
        id: "home-meds",
        label: "집에 있는 약을 먹인다",
        outcomeTitle: "권장되지 않아요",
        outcomeBody: "임의 투약은 악화 위험이 있어요. 병원 안내 없이 약을 주지 않는 게 안전해요.",
        scoreDelta: -3,
        isBest: false,
      },
    ],
  },
  {
    id: "scratching",
    title: "소파를 긁어요",
    situation: "고양이가 매일 소파를 긁고, 혼낼수록 더 빠르게 도망가요.",
    learningPoint: "스크래칭은 정상 행동이에요. 대체 행동을 만들고 환경을 바꾸는 게 핵심이에요.",
    options: [
      {
        id: "punish",
        label: "혼내고 물 뿌리기",
        outcomeTitle: "관계가 나빠질 수 있어요",
        outcomeBody: "공포만 커지고 행동이 숨어서 나타날 수 있어요. 대체/강화가 더 효과적이에요.",
        scoreDelta: -2,
        isBest: false,
      },
      {
        id: "replace",
        label: "스크래처를 소파 옆에 두고, 긁으면 보상한다",
        outcomeTitle: "좋은 방향이에요",
        outcomeBody: "대체 행동을 강화하면 소파 긁는 빈도가 줄어들 수 있어요.",
        scoreDelta: 3,
        isBest: true,
      },
      {
        id: "trim",
        label: "스크래칭을 못 하게 완전히 금지한다",
        outcomeTitle: "현실적으로 어렵고 스트레스예요",
        outcomeBody: "필요 행동이므로 가능하면 안전한 장소에서 하게 해주세요.",
        scoreDelta: -1,
        isBest: false,
      },
    ],
  },
]

export default function Home() {
  const restored = useMemo(() => (typeof window === "undefined" ? null : loadState()), [])
  const defaults = useMemo(() => createDefaultState(), [])

  const [tab, setTab] = useState<TabKey>("care")
  const [profile, setProfile] = useState<PetProfile>(restored?.profile ?? defaults.profile)
  const [symptoms, setSymptoms] = useState<SymptomInput>(restored?.symptoms ?? defaults.symptoms)
  const [meals, setMeals] = useState<MealScheduleInput>(restored?.meals ?? defaults.meals)

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [activeAlert, setActiveAlert] = useState<{ title: string; body: string } | null>(null)

  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    saveState({ profile, symptoms, meals })
  }, [profile, symptoms, meals])

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) window.clearTimeout(id)
      timeoutsRef.current = []
    }
  }, [])

  const lifeStage = useMemo(() => computeLifeStage(profile.species, profile.ageYears), [profile.species, profile.ageYears])

  function runAnalysis() {
    const triage = buildTriage(profile, symptoms)
    const causes = buildHypotheses(profile, symptoms)
    const actions = buildActions(profile, symptoms, triage, causes)
    const vetSummary = buildVetSummary(profile, symptoms)
    const redFlags = triage.redFlags

    const result: AnalysisResult = {
      triage: { level: triage.level, reasons: triage.reasons, next: triage.next },
      causes,
      actions,
      vetSummary,
      redFlags,
    }
    setAnalysis(result)
    setTab("care")
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return "unsupported" as const
    if (Notification.permission === "granted") return "granted" as const
    if (Notification.permission === "denied") return "denied" as const
    const res = await Notification.requestPermission()
    return res as "granted" | "denied" | "default"
  }

  function stopReminders() {
    for (const id of timeoutsRef.current) window.clearTimeout(id)
    timeoutsRef.current = []
    setActiveAlert(null)
  }

  async function startReminders() {
    stopReminders()
    const items = buildReminders(profile, meals)
    setReminders(items)

    const perm = await requestNotificationPermission()
    const now = Date.now()

    const upcoming = items
      .map((x) => ({ ...x, at: new Date(x.atIso).getTime() }))
      .filter((x) => x.at >= now)
      .slice(0, 60)

    for (const item of upcoming) {
      const delay = Math.max(0, item.at - now)
      const id = window.setTimeout(() => {
        setActiveAlert({ title: item.title, body: item.body })
        if (perm === "granted") {
          try {
            new Notification(item.title, { body: item.body })
          } catch {
            return
          }
        }
      }, delay)
      timeoutsRef.current.push(id)
    }
  }

  const dietAdvice = useMemo(() => buildDietAdvice(profile, symptoms), [profile, symptoms])
  const recipes = useMemo(() => safeRecipesFor(profile, meals.recipeStyle), [profile, meals.recipeStyle])

  const triageChip = useMemo(() => {
    const level = analysis?.triage.level
    if (!level) return null
    if (level === "응급") return <Chip label="응급" tone="danger" />
    if (level === "긴급") return <Chip label="긴급" tone="warn" />
    return <Chip label="비응급" tone="good" />
  }, [analysis?.triage.level])

  const headerIcon = profile.species === "cat" ? <Cat className="h-5 w-5" /> : profile.species === "dog" ? <Dog className="h-5 w-5" /> : <PawPrint className="h-5 w-5" />

  const [gameIndex, setGameIndex] = useState(0)
  const [gameScore, setGameScore] = useState(0)
  const [gameAnswer, setGameAnswer] = useState<{ scenarioId: string; optionId: string } | null>(null)

  const currentScenario = GAME_SCENARIOS[clampNumber(gameIndex, 0, GAME_SCENARIOS.length - 1)]
  const picked = gameAnswer?.scenarioId === currentScenario.id ? currentScenario.options.find((o) => o.id === gameAnswer.optionId) ?? null : null

  function resetGame() {
    setGameIndex(0)
    setGameScore(0)
    setGameAnswer(null)
  }

  function pickOption(option: GameOption) {
    if (gameAnswer?.scenarioId === currentScenario.id) return
    setGameAnswer({ scenarioId: currentScenario.id, optionId: option.id })
    setGameScore((s) => s + option.scoreDelta)
  }

  function nextScenario() {
    setGameAnswer(null)
    setGameIndex((i) => Math.min(GAME_SCENARIOS.length - 1, i + 1))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-sky-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">{headerIcon}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">반려동물 맞춤 케어 MVP</h1>
                <Chip label="예방 중심 · 응급 대비" tone="good" />
                {triageChip}
              </div>
              <p className="text-sm text-slate-600">
                이 서비스는 참고용 가이드예요. 위급 신호가 있으면 결과와 무관하게 즉시 동물병원/응급실로 이동해요.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => setTab("care")}>
              <Brain className="h-4 w-4" />
              케어
            </GhostButton>
            <GhostButton onClick={() => setTab("meal")}>
              <Utensils className="h-4 w-4" />
              식단·알림
            </GhostButton>
            <GhostButton onClick={() => setTab("game")}>
              <Sparkles className="h-4 w-4" />
              미니게임
            </GhostButton>
          </div>
        </div>

        {activeAlert ? (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
                  <AlarmClock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{activeAlert.title}</div>
                  <div className="text-sm text-slate-600">{activeAlert.body}</div>
                </div>
              </div>
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setActiveAlert(null)}>
                닫기
              </button>
            </div>
          </div>
        ) : null}

        {tab === "care" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="반려동물 정보" icon={<ClipboardList className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <FieldLabel label="이름" />
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="예: 콩이"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="종" />
                  <select
                    value={profile.species}
                    onChange={(e) => setProfile((p) => ({ ...p, species: e.target.value as Species }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="dog">강아지</option>
                    <option value="cat">고양이</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="품종" hint="모르면 비워도 돼요" />
                  <input
                    value={profile.breed}
                    onChange={(e) => setProfile((p) => ({ ...p, breed: e.target.value }))}
                    placeholder="예: 말티즈"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="성별/중성화" />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={profile.sex}
                      onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value as Sex }))}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="unknown">미기입</option>
                      <option value="male">수컷</option>
                      <option value="female">암컷</option>
                    </select>
                    <select
                      value={profile.neutered}
                      onChange={(e) => setProfile((p) => ({ ...p, neutered: e.target.value as PetProfile["neutered"] }))}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="unknown">중성화 미기입</option>
                      <option value="yes">중성화 O</option>
                      <option value="no">중성화 X</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="나이(년)" />
                  <input
                    type="number"
                    value={profile.ageYears}
                    min={0}
                    step={0.5}
                    onChange={(e) => setProfile((p) => ({ ...p, ageYears: clampNumber(Number(e.target.value), 0, 30) }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <div className="text-xs text-slate-500">생애주기: {lifeStage}</div>
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="체중(kg)" />
                  <input
                    type="number"
                    value={profile.weightKg}
                    min={0.1}
                    step={0.1}
                    onChange={(e) => setProfile((p) => ({ ...p, weightKg: clampNumber(Number(e.target.value), 0.1, 120) }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <FieldLabel label="기저질환(선택)" hint="복수 선택 가능" />
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS_PRESET.map((c) => {
                    const selected = profile.conditions.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            conditions: selected ? p.conditions.filter((x) => x !== c) : [...p.conditions, c],
                          }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <FieldLabel label="알레르기/주의(선택)" hint="예: 닭, 유제품" />
                <input
                  value={profile.allergies}
                  onChange={(e) => setProfile((p) => ({ ...p, allergies: e.target.value }))}
                  placeholder="예: 닭, 우유"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </Card>

            <Card title="행동/증상 입력" icon={<HeartPulse className="h-5 w-5" />}>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <FieldLabel label="지금 상황을 한 문장으로" hint="빈도/상황이 중요해요" />
                  <textarea
                    value={symptoms.freeText}
                    onChange={(e) => setSymptoms((s) => ({ ...s, freeText: e.target.value }))}
                    placeholder="예: 밤에 혼자 두면 계속 짖고 문을 긁어요. 최근 이사했어요."
                    className="min-h-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel label="시작 시점(선택)" />
                    <input
                      value={symptoms.startedWhen}
                      onChange={(e) => setSymptoms((s) => ({ ...s, startedWhen: e.target.value }))}
                      placeholder="예: 3일 전, 어제 밤부터"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel label="빈도(선택)" />
                    <input
                      value={symptoms.frequency}
                      onChange={(e) => setSymptoms((s) => ({ ...s, frequency: e.target.value }))}
                      placeholder="예: 하루 3회, 외출 때마다"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <FieldLabel label="강도" />
                  <select
                    value={symptoms.severity}
                    onChange={(e) => setSymptoms((s) => ({ ...s, severity: e.target.value as SymptomInput["severity"] }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="경미">경미</option>
                    <option value="보통">보통</option>
                    <option value="심함">심함</option>
                  </select>
                </div>

                <div className="mt-2 grid gap-2">
                  <FieldLabel label="빠른 체크(응급/행동 포함)" hint="해당되면 체크" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckboxRow checked={symptoms.check.breathingDifficulty} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, breathingDifficulty: v } }))} label="호흡이 힘들어 보임/헐떡임(비정상)" />
                    <CheckboxRow checked={symptoms.check.seizure} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, seizure: v } }))} label="경련" />
                    <CheckboxRow checked={symptoms.check.collapse} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, collapse: v } }))} label="쓰러짐/의식 저하" />
                    <CheckboxRow checked={symptoms.check.uncontrolledBleeding} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, uncontrolledBleeding: v } }))} label="멈추지 않는 출혈" />
                    <CheckboxRow checked={symptoms.check.vomitingBlood} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, vomitingBlood: v } }))} label="혈토/커피색 구토" />
                    <CheckboxRow checked={symptoms.check.diarrheaBlood} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, diarrheaBlood: v } }))} label="혈변" />
                    <CheckboxRow checked={symptoms.check.repeatedVomiting} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, repeatedVomiting: v } }))} label="반복 구토/설사" />
                    <CheckboxRow checked={symptoms.check.veryLethargic} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, veryLethargic: v } }))} label="심한 무기력" />
                    <CheckboxRow checked={symptoms.check.notEating24h} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, notEating24h: v } }))} label="24시간 이상 식욕 저하(또는 더 길게)" />
                    <CheckboxRow checked={symptoms.check.abdominalDistensionPain} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, abdominalDistensionPain: v } }))} label="배가 갑자기 팽만/심한 복통" />
                    <CheckboxRow checked={symptoms.check.urinationIssue} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, urinationIssue: v } }))} label="배뇨 문제(못 봄/통증/자주)" />
                    <CheckboxRow checked={symptoms.check.itching} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, itching: v } }))} label="가려움/긁음/핥음" />
                    <CheckboxRow checked={symptoms.check.coughing} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, coughing: v } }))} label="기침" />
                    <CheckboxRow checked={symptoms.check.limping} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, limping: v } }))} label="절뚝거림" />
                    <CheckboxRow checked={symptoms.check.separationAnxiety} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, separationAnxiety: v } }))} label="분리불안 의심" />
                    <CheckboxRow checked={symptoms.check.aggression} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, aggression: v } }))} label="공격성/입질" />
                    <CheckboxRow checked={symptoms.check.inappropriateElimination} onChange={(v) => setSymptoms((s) => ({ ...s, check: { ...s.check, inappropriateElimination: v } }))} label="배변/배뇨 실수" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <PrimaryButton onClick={runAnalysis}>
                    <ChevronRight className="h-4 w-4" />
                    분석하기
                  </PrimaryButton>
                  <GhostButton
                    onClick={() => {
                      setAnalysis(null)
                      setSymptoms(defaults.symptoms)
                    }}
                  >
                    초기화(증상)
                  </GhostButton>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-2">
              <Card title="분석 결과" icon={<BadgeCheck className="h-5 w-5" />}>
                {!analysis ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
                    좌측에서 정보를 입력하고 분석하기를 누르면 결과가 생성돼요.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-3">
                      <div className={cn("rounded-2xl border p-4", analysis.triage.level === "응급" ? "border-rose-200 bg-rose-50" : analysis.triage.level === "긴급" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" />
                            <div className="text-sm font-semibold">트리아지: {analysis.triage.level}</div>
                          </div>
                          {triageChip}
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                          {analysis.triage.reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        <div className="mt-3 grid gap-1">
                          <div className="text-sm font-semibold text-slate-900">다음 행동</div>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                            {analysis.triage.next.map((n) => (
                              <li key={n}>{n}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Brain className="h-5 w-5 text-slate-700" />
                          <div className="text-sm font-semibold text-slate-900">가능성 높은 원인(가설)</div>
                        </div>
                        <div className="grid gap-2">
                          {analysis.causes.map((c) => (
                            <div key={c.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                                <div className="flex items-center gap-2">
                                  <Chip label={c.category} />
                                  <Chip label={c.likelihood} tone={c.likelihood === "높음" ? "warn" : c.likelihood === "중간" ? "neutral" : "good"} />
                                </div>
                              </div>
                              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {c.why.map((w) => (
                                  <li key={w}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Bone className="h-5 w-5 text-slate-700" />
                          <div className="text-sm font-semibold text-slate-900">개선 플랜(오늘 할 일)</div>
                        </div>
                        <div className="grid gap-2">
                          {analysis.actions.map((a) => (
                            <div key={a.title} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                                <Chip label={a.category} tone={a.category === "즉시" ? "warn" : "neutral"} />
                              </div>
                              <div className="text-sm text-slate-700">{a.detail}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <ChefHat className="h-5 w-5 text-slate-700" />
                          <div className="text-sm font-semibold text-slate-900">생애주기·건강 식단 코칭</div>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Chip label={`${lifeStage}`} tone="good" />
                          <Chip label={formatSpeciesLabel(profile.species)} />
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {dietAdvice.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                        {dietAdvice.cautions.length ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <div className="text-sm font-semibold text-amber-900">주의</div>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                              {dietAdvice.cautions.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <PrimaryButton onClick={() => setTab("meal")}>
                            <Utensils className="h-4 w-4" />
                            식단·알림 설정으로
                          </PrimaryButton>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <LineChart className="h-5 w-5 text-slate-700" />
                          <div className="text-sm font-semibold text-slate-900">병원 전달용 요약(복사)</div>
                        </div>
                        <textarea readOnly value={analysis.vetSummary.join("\n")} className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none" />
                        <div className="mt-2 text-xs text-slate-500">응급은 이 요약을 들고 즉시 내원해요.</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-slate-700" />
                          <div className="text-sm font-semibold text-slate-900">악화 신호(레드 플래그)</div>
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {analysis.redFlags.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "meal" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="기간별 식단·알림 설정" icon={<CalendarDays className="h-5 w-5" />}>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <FieldLabel label="기간" />
                  <select
                    value={meals.durationDays}
                    onChange={(e) => setMeals((m) => ({ ...m, durationDays: Number(e.target.value) as MealScheduleInput["durationDays"] }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="시작일" />
                  <input type="date" value={meals.startDate} onChange={(e) => setMeals((m) => ({ ...m, startDate: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="식사 횟수/일" />
                  <select
                    value={meals.mealsPerDay}
                    onChange={(e) => setMeals((m) => ({ ...m, mealsPerDay: Number(e.target.value) as MealScheduleInput["mealsPerDay"] }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value={1}>1회</option>
                    <option value={2}>2회</option>
                    <option value={3}>3회</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="식사 시간" hint="HH:MM" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {meals.mealTimes.slice(0, 3).map((t, idx) => (
                      <input
                        key={idx}
                        type="time"
                        value={t}
                        onChange={(e) =>
                          setMeals((m) => ({
                            ...m,
                            mealTimes: m.mealTimes.map((x, i) => (i === idx ? e.target.value : x)),
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="간식/보상 시간(선택)" hint="최대 2개" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1].map((idx) => (
                      <input
                        key={idx}
                        type="time"
                        value={meals.snackTimes[idx] ?? ""}
                        onChange={(e) =>
                          setMeals((m) => ({
                            ...m,
                            snackTimes: [0, 1].map((i) => (i === idx ? e.target.value : m.snackTimes[i] ?? "")),
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="식단 스타일" hint="안전 우선" />
                  <select
                    value={meals.recipeStyle}
                    onChange={(e) => setMeals((m) => ({ ...m, recipeStyle: e.target.value as MealScheduleInput["recipeStyle"] }))}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="기성식 중심">기성식 중심(권장)</option>
                    <option value="간단 레시피">간단 레시피(토핑/워밍)</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <FieldLabel label="요리 예상 시간(분)" hint="식사 전 준비 알림 계산" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-1">
                      <span className="text-xs text-slate-500">준비</span>
                      <input type="number" min={0} value={meals.prepMinutes} onChange={(e) => setMeals((m) => ({ ...m, prepMinutes: clampNumber(Number(e.target.value), 0, 240) }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-slate-500">조리</span>
                      <input type="number" min={0} value={meals.cookMinutes} onChange={(e) => setMeals((m) => ({ ...m, cookMinutes: clampNumber(Number(e.target.value), 0, 240) }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-slate-500">식힘</span>
                      <input type="number" min={0} value={meals.coolMinutes} onChange={(e) => setMeals((m) => ({ ...m, coolMinutes: clampNumber(Number(e.target.value), 0, 240) }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <PrimaryButton onClick={startReminders}>
                    <AlarmClock className="h-4 w-4" />
                    알림 시작(현재 브라우저)
                  </PrimaryButton>
                  <GhostButton onClick={stopReminders}>
                    <ShieldAlert className="h-4 w-4" />
                    알림 중지
                  </GhostButton>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  브라우저 알림은 페이지가 열려 있을 때 안정적으로 동작해요. 실서비스에선 푸시(서비스워커/서버 스케줄러)를 붙이면 24시간 알림이 가능해요.
                </div>
              </div>
            </Card>

            <Card title="오늘 레시피/스케줄 미리보기" icon={<ChefHat className="h-5 w-5" />}>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{recipes[0]?.name ?? "레시피"}</div>
                    <Chip label={meals.recipeStyle} />
                  </div>
                  <div className="text-sm text-slate-700">
                    예상 시간: 준비 {recipes[0]?.prep ?? 0}분 · 조리 {recipes[0]?.cook ?? 0}분 · 식힘 {recipes[0]?.cool ?? 0}분
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {(recipes[0]?.steps ?? []).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlarmClock className="h-5 w-5 text-slate-700" />
                    <div className="text-sm font-semibold text-slate-900">알림 목록</div>
                  </div>
                  {reminders.length ? (
                    <div className="grid gap-2">
                      {reminders.slice(0, 12).map((r) => (
                        <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {formatTime(r.atIso)} · {r.title}
                            </div>
                            <div className="text-sm text-slate-600">{r.body}</div>
                          </div>
                          <Chip label={r.kind} />
                        </div>
                      ))}
                      {reminders.length > 12 ? <div className="text-xs text-slate-500">외 {reminders.length - 12}개</div> : null}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">알림 시작을 누르면 스케줄이 생성돼요.</div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-slate-700" />
                    <div className="text-sm font-semibold text-slate-900">규칙 식사 유도(권장 멘트)</div>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>식사 5분 전: 조용한 환경에서 흥분을 낮춰요.</li>
                    <li>식사 중: 급식이면 슬로우피더/퍼즐피더를 사용해요.</li>
                    <li>식사 후: 잔반은 치워서 규칙성을 만들고, 산책/놀이로 마무리해요.</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "game" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="반려생활 시뮬레이션 미니게임" icon={<Sparkles className="h-5 w-5" />}>
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    스코어: <span className="text-slate-700">{gameScore}</span>
                  </div>
                  <div className="flex gap-2">
                    <GhostButton onClick={resetGame}>
                      <Sparkles className="h-4 w-4" />
                      리셋
                    </GhostButton>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 text-xs font-semibold text-slate-500">
                    {gameIndex + 1}/{GAME_SCENARIOS.length}
                  </div>
                  <div className="text-base font-extrabold text-slate-900">{currentScenario.title}</div>
                  <div className="mt-2 text-sm text-slate-700">{currentScenario.situation}</div>
                  <div className="mt-3 grid gap-2">
                    {currentScenario.options.map((o) => {
                      const isPicked = picked?.id === o.id
                      const disabled = Boolean(picked)
                      return (
                        <button
                          key={o.id}
                          disabled={disabled}
                          onClick={() => pickOption(o)}
                          className={cn(
                            "w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition",
                            disabled ? "cursor-not-allowed opacity-80" : "hover:bg-slate-50",
                            isPicked ? (o.isBest ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900") : "border-slate-200 bg-white text-slate-800",
                          )}
                        >
                          {o.label}
                        </button>
                      )
                    })}
                  </div>

                  {picked ? (
                    <div className={cn("mt-4 rounded-2xl border p-3", picked.isBest ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
                      <div className="text-sm font-extrabold">{picked.outcomeTitle}</div>
                      <div className="mt-1 text-sm">{picked.outcomeBody}</div>
                      <div className="mt-3 text-xs text-slate-700">
                        학습 포인트: <span className="font-semibold">{currentScenario.learningPoint}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {gameIndex < GAME_SCENARIOS.length - 1 ? (
                          <PrimaryButton onClick={nextScenario}>
                            다음 상황
                            <ChevronRight className="h-4 w-4" />
                          </PrimaryButton>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">끝! 다시 해볼까요?</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card title="게임이 서비스에 주는 가치" icon={<PawPrint className="h-5 w-5" />}>
              <div className="grid gap-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <ShieldAlert className="h-4 w-4" />
                    응급 신호 학습
                  </div>
                  <div>위험 상황에서 “지켜보기”보다 “빠른 상담/내원”이 필요한 순간을 시뮬레이션으로 익혀요.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <Brain className="h-4 w-4" />
                    행동 문제 예방
                  </div>
                  <div>혼내기 대신 대체 행동 강화/환경 조정 같은, 동물 친화적 접근을 자연스럽게 배우게 해요.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <ChefHat className="h-4 w-4" />
                    식단 규칙성
                  </div>
                  <div>규칙적인 식사·간식 루틴이 건강 유지에 왜 중요한지, 선택의 결과로 이해하게 만들어요.</div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="안전장치" tone="warn" />
            <span>진단/처방이 아니라 참고용 가이드이며, 위험 신호가 있으면 즉시 전문 진료가 필요해요.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
