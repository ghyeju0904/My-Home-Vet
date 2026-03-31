import type { UrgencyLevel } from '@/lib/types'
import { runBehaviorAgent } from '@/agents/behaviorAgent'
import { getDesignerTone } from '@/agents/designerAgent'

export type BehaviorAnalysisInput = {
  species: 'dog' | 'cat' | 'other'
  symptoms: string[]
  description?: string
  durationDays?: number
}

export type BehaviorAnalysisResult = {
  urgency: UrgencyLevel
  likelyCauses: { title: string; confidence: 'low' | 'medium' | 'high'; rationale: string }[]
  recommendations: { title: string; steps: string[] }[]
  redFlags: string[]
  disclaimer: string
}

const RED_FLAG_SYMPTOMS = new Set([
  '호흡 곤란',
  '경련',
  '의식 저하',
  '심한 구토',
  '피 섞인 설사',
  '심한 무기력',
  '복부 팽만',
  '열사병 의심',
])

export function analyzeBehavior(input: BehaviorAnalysisInput): BehaviorAnalysisResult {
  const symptoms = new Set(input.symptoms)
  const redFlagsFromSymptoms = input.symptoms.filter((s) => RED_FLAG_SYMPTOMS.has(s))

  const duration = input.durationDays ?? 0
  const durationBucket =
    input.durationDays == null
      ? 'today'
      : duration <= 2
        ? 'days'
        : duration <= 14
          ? 'weeks'
          : 'months'

  const description = (input.description ?? '').trim()
  const lower = description.toLowerCase()
  const appetiteChange = symptoms.has('식욕 저하') || symptoms.has('밥을 남김') ? 'less' : 'none'
  const waterIntakeChange = symptoms.has('과도한 갈증') ? 'more' : 'none'
  const vomit = symptoms.has('구토') || lower.includes('토')
  const diarrhea = symptoms.has('설사') || symptoms.has('피 섞인 설사') || lower.includes('설사')
  const coughSneezing = lower.includes('기침') || lower.includes('재채기')
  const itching = lower.includes('가려') || lower.includes('긁') || lower.includes('핥')
  const lethargy = symptoms.has('심한 무기력') || lower.includes('무기력') || lower.includes('축 처')
  const painSigns = lower.includes('통증') || lower.includes('아파') || lower.includes('절뚝')
  const anxiety =
    symptoms.has('분리불안') ||
    symptoms.has('숨기') ||
    symptoms.has('잦은 짖음') ||
    symptoms.has('공격성 증가') ||
    symptoms.has('과도한 그루밍') ||
    lower.includes('불안')

  const agent = runBehaviorAgent({
    profile: {
      name: '',
      species: input.species === 'other' ? 'dog' : input.species,
      breed: '',
      ageYears: 3,
      weightKg: 5,
      sex: 'unknown',
      neutered: null,
      activityLevel: 'medium',
    },
    intake: {
      freeText: description,
      duration: durationBucket,
      appetiteChange,
      waterIntakeChange,
      vomit,
      diarrhea,
      coughSneezing,
      itching,
      lethargy,
      painSigns,
      anxiety,
    },
  })

  const urgency: UrgencyLevel =
    agent.triage === 'emergency_now' || redFlagsFromSymptoms.length > 0
      ? 'high'
      : agent.triage === 'see_vet_soon'
        ? 'medium'
        : duration >= 3
          ? 'medium'
          : 'low'

  const likelyCauses: BehaviorAnalysisResult['likelyCauses'] = agent.likelyCauses.map((c) => ({
    title: c.title,
    confidence: c.confidence,
    rationale: c.why.join(' '),
  }))

  const recommendations: BehaviorAnalysisResult['recommendations'] = [
    { title: '지금(바로)', steps: agent.improvementPlan.now },
    { title: '24시간 내', steps: agent.improvementPlan.next24h },
    { title: '루틴 개선', steps: agent.improvementPlan.routine },
    { title: '심리 안정', steps: agent.improvementPlan.mindStability },
    { title: '병원 방문 체크리스트', steps: agent.vetVisitChecklist },
  ]

  if (urgency === 'high') {
    recommendations.unshift({
      title: '응급 대응(우선)',
      steps: [
        '지금은 앱 안내보다 동물병원 상담/내원이 우선이에요.',
        '호흡·의식·잇몸색(창백/푸르스름)·보행을 빠르게 확인해요.',
        '임의로 사람 약을 주거나 억지로 먹이는 행동은 피하세요.',
      ],
    })
  }

  const redFlags = Array.from(new Set([...agent.redFlags, ...redFlagsFromSymptoms]))
  const disclaimer = getDesignerTone().disclaimerLong

  return { urgency, likelyCauses, recommendations, redFlags, disclaimer }
}
