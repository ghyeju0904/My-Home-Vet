import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Sparkles, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { analyzeBehavior } from '@/lib/analysisEngine'
import type { Pet, UrgencyLevel } from '@/lib/types'
import { useToast } from '@/components/ToastProvider'
import { getDeviceId } from '@/lib/device'

const SYMPTOMS = [
  '식욕 저하',
  '밥을 남김',
  '구토',
  '설사',
  '변비',
  '심한 무기력',
  '호흡 곤란',
  '경련',
  '의식 저하',
  '피 섞인 설사',
  '잦은 짖음',
  '분리불안',
  '숨기',
  '과도한 그루밍',
  '공격성 증가',
  '배뇨 실수',
  '과도한 갈증',
]

function urgencyBadge(level: UrgencyLevel) {
  if (level === 'high') return 'bg-rose-600 text-white'
  if (level === 'medium') return 'bg-amber-400 text-slate-900'
  return 'bg-emerald-400 text-slate-900'
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

function unique(items: string[]) {
  return Array.from(new Set(items))
}

function extractSymptomsFromText(text: string) {
  const t = text.toLowerCase()
  const suggested: string[] = []
  const add = (s: string) => {
    if (SYMPTOMS.includes(s)) suggested.push(s)
  }

  if (t.includes('토') || t.includes('구토')) add('구토')
  if (t.includes('설사')) add('설사')
  if (t.includes('변비')) add('변비')
  if (t.includes('피') && (t.includes('설사') || t.includes('변'))) add('피 섞인 설사')
  if (t.includes('경련')) add('경련')
  if (t.includes('의식') || t.includes('쓰러') || t.includes('실신')) add('의식 저하')
  if (t.includes('호흡') || t.includes('숨') || t.includes('헐떡')) add('호흡 곤란')
  if (t.includes('무기력') || t.includes('축 처') || t.includes('기운')) add('심한 무기력')
  if (t.includes('짖')) add('잦은 짖음')
  if (t.includes('분리') || t.includes('혼자')) add('분리불안')
  if (t.includes('숨') && t.includes('가')) add('숨기')
  if (t.includes('그루밍') || t.includes('핥') || t.includes('털')) add('과도한 그루밍')
  if (t.includes('공격') || t.includes('입질') || t.includes('물')) add('공격성 증가')
  if (t.includes('실수') && (t.includes('오줌') || t.includes('소변') || t.includes('배뇨'))) add('배뇨 실수')
  if (t.includes('갈증') || (t.includes('물') && t.includes('많이'))) add('과도한 갈증')
  if (t.includes('식욕') && (t.includes('없') || t.includes('저하') || t.includes('감소'))) add('식욕 저하')
  if (t.includes('밥') && (t.includes('남') || t.includes('안 먹'))) add('밥을 남김')

  return unique(suggested)
}

function extractDurationDays(text: string) {
  const m1 = text.match(/(\d+)\s*일/)
  if (m1?.[1]) return Number(m1[1])
  const m2 = text.match(/(\d+)\s*주/)
  if (m2?.[1]) return Number(m2[1]) * 7
  const m3 = text.match(/(\d+)\s*개월/)
  if (m3?.[1]) return Number(m3[1]) * 30
  return null
}

function nextInterviewQuestion(ctx: { asked: Set<string>; currentText: string }) {
  const t = ctx.currentText.toLowerCase()
  const ask = (key: string, q: string) => {
    if (ctx.asked.has(key)) return null
    ctx.asked.add(key)
    return q
  }

  if (!t) return '지금 어떤 행동/증상이 가장 걱정되나요? “언제부터, 얼마나 자주, 어떤 상황에서”를 같이 적어주세요.'
  return (
    ask('duration', '언제부터 시작했나요? 오늘/며칠/몇 주 중에 가까운가요?') ??
    ask('trigger', '직전에 바뀐 게 있나요? (사료/간식/산책/이사/가족 변화/미용/호텔링/접종 등)') ??
    ask('appetite', '식욕/물 섭취는 평소 대비 어떤가요? (정상/감소/증가)') ??
    ask('poop', '배변(설사/변비/혈변)이나 구토가 있나요? 있다면 횟수와 마지막 시간은요?') ??
    ask('breath', '호흡이 힘들어 보이거나(헐떡임/거친 숨) 혀·잇몸 색이 평소와 다른가요?') ??
    ask('pain', '만지면 싫어하거나 절뚝거림, 웅크림 같은 통증 신호가 있나요?') ??
    ask('safety', '가장 최근의 “가장 심한 순간”을 한 문장으로 적어주세요(영상 촬영 권장).') ??
    '좋아요. 지금까지 내용을 바탕으로 증상 체크/설명을 더 정확하게 정리해볼게요. 추가로 떠오르는 정보가 있으면 계속 입력해 주세요.'
  )
}

export default function BehaviorAnalysis() {
  const { pushToast } = useToast()
  const [pets, setPets] = useState<Pet[]>([])
  const [petId, setPetId] = useState<string>('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [durationDays, setDurationDays] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<ReturnType<typeof analyzeBehavior> | null>(null)
  const [saving, setSaving] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'm1', role: 'assistant', text: '안녕하세요. 문진을 도와드릴게요. 어떤 행동/증상이 가장 걱정되나요?' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [suggestedSymptoms, setSuggestedSymptoms] = useState<string[]>([])
  const askedRef = useRef<Set<string>>(new Set())
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

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

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPet) {
      pushToast({ title: '반려동물을 먼저 등록해 주세요.', variant: 'warning' })
      return
    }
    const next = analyzeBehavior({
      species: selectedPet.species,
      symptoms,
      description,
      durationDays: durationDays === '' ? undefined : Number(durationDays),
    })
    setResult(next)
  }

  const save = async () => {
    if (!result || !selectedPet) return

    setSaving(true)
    const { error } = await supabase.from('behavior_analyses').insert({
      device_id: getDeviceId(),
      pet_id: selectedPet.id,
      symptoms,
      description: description.trim() || null,
      duration_days: durationDays === '' ? null : Number(durationDays),
      urgency_level: result.urgency,
      likely_causes: result.likelyCauses,
      recommendations: result.recommendations,
    })
    setSaving(false)
    if (error) {
      pushToast({ title: '저장 실패', message: error.message, variant: 'danger' })
      return
    }
    pushToast({ title: '기록 저장 완료', message: '히스토리는 추후 마이페이지에서 확장 가능해요.', variant: 'success' })
  }

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ block: 'end' })
  }, [chatMessages.length])

  const applySuggestedSymptoms = () => {
    if (!suggestedSymptoms.length) return
    setSymptoms((prev) => unique([...prev, ...suggestedSymptoms]))
    pushToast({ title: '증상 체크에 반영했어요', variant: 'success' })
  }

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')

    setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }])
    setDescription((prev) => (prev ? `${prev}\n${text}` : text))

    const extractedSymptoms = extractSymptomsFromText(text)
    if (extractedSymptoms.length) setSuggestedSymptoms((prev) => unique([...prev, ...extractedSymptoms]))

    if (durationDays === '') {
      const d = extractDurationDays(text)
      if (d != null && Number.isFinite(d)) setDurationDays(d)
    }

    const nextQ = nextInterviewQuestion({ asked: askedRef.current, currentText: text })
    setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: nextQ }])
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">행동/증상 분석</div>
            <div className="mt-1 text-sm text-slate-700">결과는 참고용이며, 위급하면 즉시 병원으로 안내해요.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
            <TriangleAlert className="size-4" />
            응급 우선
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <form onSubmit={run} className="space-y-3">
          <label className="block">
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

          <div>
            <div className="text-xs font-semibold text-slate-700">증상/행동</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  className={[
                    'rounded-2xl border px-3 py-2 text-left text-sm font-semibold',
                    symptoms.includes(s) ? 'border-rose-200 bg-rose-50 text-slate-900' : 'border-white bg-white/60 text-slate-700',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-xs font-semibold text-slate-700">지속 기간(일, 선택)</div>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value === '' ? '' : Number(e.target.value))}
                type="number"
                min={0}
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-700">추가 설명(선택)</div>
              <textarea
                className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 산책 후부터 시작, 밤에 심해짐"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            분석하기
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-2xl bg-white/70 text-slate-900 ring-1 ring-slate-200">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">AI 문진 대화</div>
              <div className="text-xs text-slate-600">대화로 정보를 더 구체화해 증상 체크/설명란을 정리해요.</div>
            </div>
          </div>
          {suggestedSymptoms.length ? (
            <button
              type="button"
              onClick={applySuggestedSymptoms}
              className="rounded-2xl bg-[#A8E6CF]/40 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              추천 증상 적용
            </button>
          ) : null}
        </div>

        {suggestedSymptoms.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedSymptoms.map((s) => (
              <span key={s} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-600">예: “어제부터 토했어요”, “혼자 두면 짖고 문을 긁어요”</div>
        )}

        <div className="mt-4 rounded-3xl border border-white bg-white/60 p-3">
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
            {chatMessages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={[
                    'max-w-[min(520px,90%)] rounded-2xl px-3 py-2 text-sm font-semibold',
                    m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200',
                  ].join(' ')}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
              <MessageCircle className="size-5" />
            </div>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendChat()
              }}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
              placeholder="상황을 자세히 적어주세요"
            />
            <button
              type="button"
              onClick={sendChat}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              <Send className="size-4" />
              전송
            </button>
          </div>
        </div>
      </section>

      {result ? (
        <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">분석 결과</div>
            <div className={['rounded-2xl px-3 py-1 text-xs font-semibold', urgencyBadge(result.urgency)].join(' ')}>
              {result.urgency === 'high' ? '위험' : result.urgency === 'medium' ? '주의' : '안전'}
            </div>
          </div>

          {result.redFlags.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-slate-900">
              <div className="font-semibold">응급 신호</div>
              <div className="mt-1 text-slate-700">{result.redFlags.join(', ')}</div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white bg-white/60 p-4">
              <div className="text-sm font-semibold text-slate-900">가능성 높은 원인</div>
              <div className="mt-2 space-y-2">
                {result.likelyCauses.map((c) => (
                  <div key={c.title} className="rounded-2xl border border-white bg-white px-3 py-2">
                    <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                    <div className="text-xs text-slate-600">확률 추정: {c.confidence}</div>
                    <div className="mt-1 text-sm text-slate-700">{c.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white bg-white/60 p-4">
              <div className="text-sm font-semibold text-slate-900">개선 방법</div>
              <div className="mt-2 space-y-2">
                {result.recommendations.map((r) => (
                  <div key={r.title} className="rounded-2xl border border-white bg-white px-3 py-2">
                    <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700">
                      {r.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-600">{result.disclaimer}</div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? '저장 중...' : '이 결과를 기록하기'}
            </button>
            <a
              className="rounded-2xl bg-[#A8E6CF]/40 px-4 py-2 text-sm font-semibold text-slate-900"
              href="https://www.google.com/maps/search/%EB%8F%99%EB%AC%BC%EB%B3%91%EC%9B%90"
              target="_blank"
              rel="noreferrer"
            >
              병원 찾기
            </a>
          </div>
        </section>
      ) : null}
    </div>
  )
}
