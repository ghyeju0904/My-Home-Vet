import type { BehaviorAnalysis, BehaviorIntake, CauseCandidate, PetProfile, TriageLevel } from '@/domain/care'

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function includesAny(text: string, words: string[]) {
  return words.some(w => text.includes(w))
}

function triageFromSignals(args: {
  profile: PetProfile
  intake: BehaviorIntake
  normalizedText: string
}): { triage: TriageLevel; redFlags: string[] } {
  const { intake, normalizedText } = args
  const redFlags: string[] = []

  const emergencyTextHits = [
    '호흡곤란',
    '숨을 못',
    '숨이',
    '헐떡',
    '청색증',
    '파랗',
    '경련',
    '발작',
    '의식',
    '기절',
    '쓰러',
    '피',
    '대량출혈',
    '혈변',
    '검은변',
    '피토',
    '복부팽만',
    '배가 빵빵',
    '중독',
    '초콜릿',
    '포도',
    '양파',
    '자일리톨',
    'antifreeze',
    'seizure',
    'collapse',
    'difficulty breathing',
    'poison',
    'bloody stool',
    'bloody vomit',
  ]

  if (includesAny(normalizedText, emergencyTextHits)) {
    redFlags.push('호흡 이상/청색증/발작/의식 저하/출혈/중독 의심 키워드')
  }

  if ((intake.vomit && intake.lethargy) || (intake.diarrhea && intake.lethargy)) {
    redFlags.push('구토/설사와 함께 무기력')
  }

  if (intake.painSigns && (intake.lethargy || intake.appetiteChange === 'less')) {
    redFlags.push('통증 징후 + 무기력/식욕 저하')
  }

  if (intake.waterIntakeChange === 'more' && intake.appetiteChange === 'less') {
    redFlags.push('물 섭취 증가 + 식욕 저하(대사성 질환 가능)')
  }

  if (includesAny(normalizedText, ['24시간', '이틀', '48시간', '지속', '계속']) && (intake.vomit || intake.diarrhea)) {
    redFlags.push('구토/설사가 24시간 이상 지속 가능성')
  }

  const triage: TriageLevel =
    redFlags.length >= 2
      ? 'emergency_now'
      : redFlags.length === 1
        ? 'see_vet_soon'
        : intake.vomit || intake.diarrhea || intake.coughSneezing || intake.lethargy
          ? 'monitor'
          : 'monitor'

  return { triage, redFlags }
}

function buildLikelyCauses(intake: BehaviorIntake, normalizedText: string): CauseCandidate[] {
  const causes: CauseCandidate[] = []

  if ((intake.vomit || intake.diarrhea) && includesAny(normalizedText, ['간식', '사료', '바꿨', '갑자기', '먹었', '쓰레기', '산책 중', '뭔가'])) {
    causes.push({
      title: '급격한 식이 변화/이물 섭취로 인한 위장 자극',
      confidence: 'high',
      why: [
        '구토/설사와 함께 “사료/간식 변경, 뭔가 주워먹음” 단서가 있음',
        '반려동물에서 흔한 급성 위장 증상 패턴',
      ],
    })
  }

  if (intake.diarrhea && includesAny(normalizedText, ['점액', '혈', '악취', '물설사'])) {
    causes.push({
      title: '장염/장내 미생물 불균형(감염성 포함 가능)',
      confidence: 'medium',
      why: ['물설사/점액/혈변 단서', '탈수 위험이 올라가 관찰이 필요'],
    })
  }

  if (intake.itching || includesAny(normalizedText, ['긁', '핥', '발을', '귀', '비듬', '털빠짐'])) {
    causes.push({
      title: '피부 알레르기(환경/식이) 또는 외부기생충(벼룩/진드기) 가능',
      confidence: 'medium',
      why: ['가려움/핥기/귀 불편 단서', '계절·산책·새 간식과 연관될 수 있음'],
    })
  }

  if (intake.coughSneezing || includesAny(normalizedText, ['기침', '켁켁', '재채기', '콧물'])) {
    causes.push({
      title: '상기도 자극(감기/기관지염/알레르기) 가능',
      confidence: 'medium',
      why: ['기침/재채기 단서', '활동량·식욕·호흡 상태에 따라 위험도가 달라짐'],
    })
  }

  if (intake.anxiety || includesAny(normalizedText, ['분리불안', '하울링', '짖', '파괴', '배변실수', '숨기', '경계'])) {
    causes.push({
      title: '스트레스/환경 변화에 따른 불안(분리불안 포함) 가능',
      confidence: 'medium',
      why: ['불안 관련 행동 단서', '루틴 변화, 소음, 가족 구성 변화가 트리거일 수 있음'],
    })
  }

  if (intake.lethargy && intake.appetiteChange === 'less') {
    causes.push({
      title: '통증/발열/전신 컨디션 저하(다양한 원인)',
      confidence: 'low',
      why: ['무기력+식욕 저하 조합은 비특이적이지만 중요한 신호', '동반 증상(구토/설사/기침 등)에 따라 우선순위가 달라짐'],
    })
  }

  if (causes.length === 0) {
    causes.push({
      title: '생활 패턴·환경 요인(수면/산책/소음/보호자 부재 등)',
      confidence: 'low',
      why: ['명확한 신체 증상 단서가 적음', '기본 루틴 정리와 관찰 로그가 원인 분리에 도움'],
    })
  }

  return causes.slice(0, 4)
}

export function runBehaviorAgent(args: {
  profile: PetProfile
  intake: BehaviorIntake
}): BehaviorAnalysis {
  const normalizedText = normalize(args.intake.freeText)
  const { triage, redFlags } = triageFromSignals({ profile: args.profile, intake: args.intake, normalizedText })
  const likelyCauses = buildLikelyCauses(args.intake, normalizedText)

  const now: string[] = [
    '호흡·잇몸색(창백/푸르스름)·의식·보행·통증 반응을 5분 단위로 빠르게 확인',
    '구토/설사가 있으면 물은 소량씩 자주 제공(한 번에 많이 먹이면 재구토 가능)',
    '새 간식/사료/영양제, 기름진 음식은 즉시 중단',
  ]

  if (args.intake.vomit || args.intake.diarrhea) {
    now.push('탈수 징후(잇몸 끈적, 피부 탄력 저하, 소변 감소)가 보이면 즉시 병원 문의')
  }

  const next24h: string[] = [
    '증상 발생 시각·빈도·변/구토 사진·섭취한 음식·산책 중 섭취 가능 물질을 기록',
    '기침/재채기가 있으면 흥분·격한 운동을 줄이고 실내 습도(40–60%) 유지',
    '가려움이 있으면 벼룩/진드기 확인(목·꼬리기저·배) 및 최근 산책/침구 세탁 여부 점검',
  ]

  const routine: string[] = [
    '식사·산책·놀이·수면 시간을 일정하게 유지(예측 가능성이 스트레스 완화에 도움)',
    '간식은 하루 열량의 10% 이내로 제한하고, 새 간식은 3–5일에 걸쳐 소량 도입',
    '하루 1회 체중(주 2–3회)과 배변/식욕을 체크하는 간단한 건강 루틴 만들기',
  ]

  const mindStability: string[] = [
    '안정 구역(담요/하우스) + 소음 차단(화이트노이즈)로 휴식 품질을 확보',
    '하루 10분 냄새놀이(노즈워크) + 짧은 성공 경험(기본 훈련)으로 긴장도 낮추기',
    '분리불안 의심 시 외출 신호(가방/신발) 탈감작 + 짧은 외출부터 단계적 확장',
  ]

  const nextQuestions: string[] = [
    '증상이 시작된 정확한 시점과 빈도는 어느 정도인가요?',
    '최근 7일 내 사료/간식/영양제 변경, 사람 음식 섭취, 산책 중 주워먹음이 있었나요?',
    '체온 상승 느낌, 떨림, 복부 통증(만지면 싫어함), 배변/소변 변화가 있나요?',
    '예방접종/심장사상충/구충(내·외부) 일정은 최근 언제였나요?',
  ]

  const vetVisitChecklist: string[] = [
    '증상 영상/사진(기침 소리, 걸음걸이, 구토/변 사진)',
    '최근 먹인 음식/간식/약/영양제 목록과 용량',
    '증상 타임라인(언제 시작, 하루 몇 회, 악화/완화 요인)',
  ]

  const summaryParts: string[] = []
  summaryParts.push(`${args.profile.name || '반려동물'}의 입력 정보를 바탕으로, 현재는 “${triage === 'emergency_now' ? '응급 우선' : triage === 'see_vet_soon' ? '빠른 병원 상담 권장' : '관찰+루틴 개선' }” 단계로 판단됩니다.`)
  if (likelyCauses.length > 0) summaryParts.push(`가능성이 높은 원인은 ${likelyCauses[0].title} 등을 포함합니다.`)

  return {
    triage,
    redFlags,
    summary: summaryParts.join(' '),
    likelyCauses,
    nextQuestions,
    improvementPlan: { now, next24h, routine, mindStability },
    vetVisitChecklist,
  }
}
