import { useMemo, useState } from 'react'
import { HeartPulse, ShieldAlert, Sparkles } from 'lucide-react'
import { Card, CardDesc, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

type Scenario = {
  id: string
  title: string
  situation: string
  learning: string
  choices: { id: string; label: string; score: number; outcomeTitle: string; outcomeBody: string; best?: boolean }[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'chocolate',
    title: '초콜릿을 먹었어요',
    situation: '강아지가 바닥의 초콜릿을 먹었어요. 아직 증상은 없지만 섭취량은 불확실해요.',
    learning: '독성 식품은 “증상 전”에도 위험할 수 있어요. 섭취량/체중/시간이 핵심 정보입니다.',
    choices: [
      { id: 'call', label: '바로 병원/응급에 전화하고 섭취량·시간·체중을 공유한다', score: 3, outcomeTitle: '가장 안전한 선택', outcomeBody: '필요한 조치(내원/관찰/처치)가 빠르게 결정돼요.', best: true },
      { id: 'wait', label: '지켜보다가 내일 병원에 간다', score: -2, outcomeTitle: '위험할 수 있어요', outcomeBody: '독성은 시간이 지나며 진행할 수 있어요.' },
      { id: 'home', label: '집에 있는 약/민간요법으로 해결한다', score: -3, outcomeTitle: '권장되지 않아요', outcomeBody: '임의 투약은 악화 위험이 있어요.' },
    ],
  },
  {
    id: 'itching',
    title: '계속 긁고 핥아요',
    situation: '최근 산책이 늘어난 이후, 발과 귀를 자주 긁고 핥아요.',
    learning: '가려움은 알레르기/피부염/외부기생충 등 원인이 다양해요. 최근 변화(환경·간식·산책)를 분리해야 해요.',
    choices: [
      { id: 'plan', label: '최근 72시간 새 간식 중단 + 발·하복부 가볍게 세척 + 기생충 확인', score: 3, outcomeTitle: '좋은 접근', outcomeBody: '자극을 줄이고 원인 분리에 도움이 돼요.', best: true },
      { id: 'change-all', label: '사료/간식/샴푸를 한 번에 전부 바꾼다', score: -2, outcomeTitle: '원인 분리가 어려워요', outcomeBody: '한 번에 많이 바꾸면 어떤 게 문제인지 알기 어려워요.' },
      { id: 'ignore', label: '그냥 무시하고 지켜본다', score: -1, outcomeTitle: '악화될 수 있어요', outcomeBody: '피부는 빠르게 악화될 수 있어 조기 관리가 좋아요.' },
    ],
  },
  {
    id: 'routine',
    title: '혼자 있으면 불안해요',
    situation: '외출하면 짖고, 물건을 부수고, 배변 실수도 생겨요.',
    learning: '분리불안은 “단계적 노출”과 “예측 가능한 루틴”이 핵심이에요. 처벌은 불안을 키울 수 있어요.',
    choices: [
      { id: 'step', label: '30초~2분부터 짧은 외출을 반복하며 점진 확장 + 노즈워크 제공', score: 3, outcomeTitle: '정석에 가까워요', outcomeBody: '불안을 낮추고 혼자 있는 기술을 학습해요.', best: true },
      { id: 'scold', label: '혼내서 못 하게 만든다', score: -2, outcomeTitle: '관계/불안이 악화될 수 있어요', outcomeBody: '처벌은 불안을 더 키우는 경우가 많아요.' },
      { id: 'big-leave', label: '어차피 익숙해지겠지 하고 장시간 외출한다', score: -3, outcomeTitle: '악화 가능성이 커요', outcomeBody: '갑작스런 장시간 노출은 공황 반응을 강화할 수 있어요.' },
    ],
  },
]

function pickNext(excludeId?: string) {
  const pool = SCENARIOS.filter(s => s.id !== excludeId)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function Game() {
  const [score, setScore] = useState(0)
  const [turn, setTurn] = useState(1)
  const [scenario, setScenario] = useState<Scenario>(() => pickNext())
  const [result, setResult] = useState<{ title: string; body: string; best?: boolean } | null>(null)

  const scoreTone = useMemo(() => {
    if (score >= 6) return 'success' as const
    if (score >= 2) return 'info' as const
    if (score >= 0) return 'neutral' as const
    return 'warn' as const
  }, [score])

  function choose(choiceId: string) {
    const c = scenario.choices.find(x => x.id === choiceId)
    if (!c) return
    setScore(s => s + c.score)
    setResult({ title: c.outcomeTitle, body: c.outcomeBody, best: c.best })
  }

  function next() {
    setTurn(t => t + 1)
    setScenario(pickNext(scenario.id))
    setResult(null)
  }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              반려 생활 시뮬레이션 미니게임
            </CardTitle>
            <CardDesc className="mt-1">상황에 대한 대응을 게임으로 연습해서, 실제 생활에서는 더 빠르게 예방/대처할 수 있게 돕습니다.</CardDesc>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={scoreTone}>점수 {score}</Badge>
            <Badge tone="neutral">턴 {turn}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {scenario.title}
        </CardTitle>
        <div className="mt-3 rounded-2xl bg-white/60 p-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/30 dark:text-slate-200 dark:ring-slate-700">
          {scenario.situation}
        </div>

        <div className="mt-4 grid gap-2">
          {scenario.choices.map(c => (
            <Button key={c.id} variant="secondary" onClick={() => choose(c.id)} disabled={!!result}>
              {c.label}
            </Button>
          ))}
        </div>

        {result ? (
          <div className="mt-4 rounded-3xl bg-white/50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/25 dark:ring-slate-700">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{result.title}</div>
              {result.best ? <Badge tone="success">베스트</Badge> : <Badge tone="warn">개선 여지</Badge>}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{result.body}</div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <HeartPulse className="h-4 w-4" />
                학습 포인트: {scenario.learning}
              </div>
              <Button onClick={next}>다음 상황</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            실제 응급 상황에서는 게임보다 “즉시 병원 상담”이 우선입니다.
          </div>
        )}
      </Card>
    </div>
  )
}

