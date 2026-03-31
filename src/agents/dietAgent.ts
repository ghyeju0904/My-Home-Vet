import type { ActivityLevel, DietConsult, Goal, LifeStage, PetProfile, Recipe, Species } from '@/domain/care'

function lifeStageFor(profile: PetProfile): LifeStage {
  if (profile.ageYears < 1) return 'puppy_kitten'
  if (profile.species === 'cat') return profile.ageYears >= 10 ? 'senior' : 'adult'
  return profile.ageYears >= 8 ? 'senior' : 'adult'
}

function rer(weightKg: number) {
  const safe = Math.max(0.5, weightKg)
  return 70 * Math.pow(safe, 0.75)
}

function activityFactor(level: ActivityLevel) {
  if (level === 'low') return 1.2
  if (level === 'high') return 1.6
  return 1.4
}

function goalFactor(goal: Goal) {
  if (goal === 'weight_loss') return 0.8
  if (goal === 'weight_gain') return 1.2
  if (goal === 'diabetes_support') return 0.95
  if (goal === 'kidney_support') return 0.95
  return 1
}

function baseRecipeLibrary(species: Species): Recipe[] {
  const common: Recipe[] = [
    {
      id: 'gentle_chicken_rice',
      title: '부드러운 닭가슴살+쌀죽 베이스',
      forSpecies: ['dog', 'cat'],
      tags: ['위장', '기본', '저자극'],
      prepMinutes: 10,
      cookMinutes: 25,
      ingredients: [
        { item: '닭가슴살(익힌 것)', amount: '200g' },
        { item: '백미(마른 쌀)', amount: '70g' },
        { item: '단호박 또는 호박(익힌 것)', amount: '100g' },
        { item: '물', amount: '600–700ml' },
      ],
      steps: [
        '쌀을 씻고 물 600–700ml로 죽처럼 푹 끓입니다.',
        '닭가슴살을 완전히 익혀 잘게 찢습니다.',
        '호박을 익혀 으깨서 죽에 섞습니다.',
        '먹기 좋은 온도로 식힌 후 급여합니다.',
      ],
      notes: [
        '단기(1–2일) 위장 안정용으로 적합합니다.',
        '장기 급여는 필수 미네랄/칼슘 보충이 필요하므로 수의사와 상의하세요.',
      ],
    },
    {
      id: 'turkey_pumpkin_bowl',
      title: '칠면조+단호박 볼',
      forSpecies: ['dog'],
      tags: ['저지방', '피부', '체중'],
      prepMinutes: 12,
      cookMinutes: 18,
      ingredients: [
        { item: '칠면조 다짐육(기름 적은 것)', amount: '220g' },
        { item: '단호박(익힌 것)', amount: '160g' },
        { item: '브로콜리(익힌 것)', amount: '60g' },
        { item: '올리브오일 또는 연어오일', amount: '티스푼 1' },
      ],
      steps: [
        '칠면조를 기름 없이 볶아 완전히 익힙니다.',
        '단호박을 으깨고 브로콜리를 잘게 다집니다.',
        '재료를 섞고 식힌 뒤 급여합니다.',
      ],
      notes: ['연어오일은 피부·피모에 도움될 수 있으나 설사를 유발하면 중단합니다.'],
    },
    {
      id: 'salmon_oat_congee',
      title: '연어+오트 죽(소량)',
      forSpecies: ['cat'],
      tags: ['기호성', '피부', '수분'],
      prepMinutes: 10,
      cookMinutes: 15,
      ingredients: [
        { item: '연어(완전히 익힌 것, 가시 제거)', amount: '120g' },
        { item: '오트밀(무가당)', amount: '30g' },
        { item: '물', amount: '350ml' },
        { item: '달걀 노른자(익힌 것)', amount: '1개' },
      ],
      steps: [
        '오트밀과 물을 끓여 걸쭉하게 만듭니다.',
        '익힌 연어를 으깨 섞고, 노른자를 익혀 잘게 섞습니다.',
        '미지근하게 식혀 급여합니다.',
      ],
      notes: ['고양이는 탄수화물 과다에 민감할 수 있어 주식 대체보다는 보조용으로 권장합니다.'],
    },
  ]

  return common.filter(r => r.forSpecies.includes(species))
}

export function runDietAgent(args: {
  profile: PetProfile
  goal: Goal
  conditions: string[]
  allergies: string[]
}): DietConsult {
  const lifeStage = lifeStageFor(args.profile)
  const calories = Math.round(rer(args.profile.weightKg) * activityFactor(args.profile.activityLevel) * goalFactor(args.goal))

  const feedingGuidance: string[] = []
  if (lifeStage === 'puppy_kitten') {
    feedingGuidance.push('성장기: 하루 3–4회로 나누어 급여하고, 급격한 체중 변화가 없도록 주 1회 체중 확인')
  } else if (lifeStage === 'senior') {
    feedingGuidance.push('노령기: 단백질 품질은 유지하되, 소화가 편한 형태(습식/따뜻하게)와 수분 섭취를 강화')
  } else {
    feedingGuidance.push('성견/성묘: 하루 2회 규칙 급여를 기본으로, 간식은 열량의 10% 이내')
  }

  if (args.goal === 'weight_loss') feedingGuidance.push('체중 감량: 급여량을 서서히 조정하고, 간식은 “계량된 보상”으로 전환')
  if (args.goal === 'sensitive_stomach') feedingGuidance.push('민감한 위장: 저지방·저자극 식재료 중심, 새 재료는 한 번에 1개씩')
  if (args.goal === 'skin_coat') feedingGuidance.push('피부/피모: 오메가-3(연어오일 등) 소량, 알레르기 의심 시 단일 단백질로 단순화')

  const treatRules: string[] = [
    '간식은 하루 열량의 10% 이내',
    '새 간식은 3–5일에 걸쳐 소량 도입',
    '구토/설사/가려움 악화 시 최근 72시간 내 새 간식부터 중단',
  ]

  const transitionPlan: string[] = [
    'Day 1–2: 기존 식단 75% + 새 식단 25%',
    'Day 3–4: 기존 50% + 새 50%',
    'Day 5–6: 기존 25% + 새 75%',
    'Day 7: 새 식단 100%(변 상태가 안정적일 때만)',
  ]

  const cautionNotes: string[] = [
    '장기 “홈메이드 주식”은 칼슘·미네랄·비타민 균형이 무너지기 쉬워 수의사/영양전문가 설계가 필요합니다.',
    '포도/건포도, 양파/마늘, 초콜릿, 자일리톨, 알코올, 카페인은 금지입니다.',
  ]

  if (args.conditions.some(c => /신장|kidney/i.test(c)) || args.goal === 'kidney_support') {
    cautionNotes.push('신장 질환 의심/진단이 있으면 단백질·인·나트륨 조절이 필요하므로 반드시 병원 처방식/상담을 우선하세요.')
  }

  return {
    lifeStage,
    dailyCaloriesEstimate: calories,
    feedingGuidance,
    treatRules,
    transitionPlan,
    recipeLibrary: baseRecipeLibrary(args.profile.species),
    cautionNotes,
  }
}
