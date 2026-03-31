import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Plus, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Pet } from '@/lib/types'
import { getDeviceId } from '@/lib/device'

function openVetSearch(lat: number, lng: number) {
  const q = encodeURIComponent('동물병원')
  const url = `https://www.google.com/maps/search/${q}/@${lat},${lng},14z`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function Dashboard() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [geoStatus, setGeoStatus] = useState<string | null>(null)

  const primaryPet = useMemo(() => pets[0] ?? null, [pets])

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('pets')
          .select('*')
          .eq('device_id', getDeviceId())
          .order('created_at', { ascending: true })
        if (!isMounted) return
        setPets((data as Pet[]) ?? [])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void run()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">오늘의 케어</div>
            <div className="text-sm text-slate-700">예방 중심으로 기록하고, 위급하면 빠르게 병원으로 연결해요.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/analysis"
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <TriangleAlert className="size-4" />
              응급 체크
            </Link>
            <Link
              to="/pet"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="size-4" />
              반려동물 등록
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="text-sm font-semibold text-slate-900">내 반려동물</div>
          {loading ? (
            <div className="mt-3 text-sm text-slate-600">불러오는 중...</div>
          ) : pets.length === 0 ? (
            <div className="mt-3 text-sm text-slate-700">아직 등록된 반려동물이 없어요.</div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {pets.slice(0, 3).map((p) => (
                <div key={p.id} className="rounded-2xl border border-white bg-white/60 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-600">
                    {p.species} · {p.breed ?? '품종 미입력'} · {p.age_years ?? '-'}세
                  </div>
                </div>
              ))}
              {pets.length > 3 ? <div className="text-xs text-slate-600">+ {pets.length - 3}마리 더</div> : null}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">인근 동물병원</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#A8E6CF]/40 px-3 py-2 text-xs font-semibold text-slate-900"
              onClick={() => {
                setGeoStatus('위치 확인 중...')
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setGeoStatus(null)
                    openVetSearch(pos.coords.latitude, pos.coords.longitude)
                  },
                  () => setGeoStatus('위치 권한이 필요해요.'),
                  { enableHighAccuracy: true, timeout: 8000 },
                )
              }}
            >
              <MapPin className="size-4" />
              GPS로 찾기
            </button>
          </div>
          <div className="mt-3 text-sm text-slate-700">위급(호흡 곤란, 경련, 의식 저하 등)하면 앱 안내보다 병원 연락/내원이 우선이에요.</div>
          {geoStatus ? <div className="mt-2 text-xs text-slate-600">{geoStatus}</div> : null}
          <div className="mt-3 text-xs text-slate-600">{primaryPet ? `선택 펫: ${primaryPet.name}` : '펫을 등록하면 더 정확한 추천 흐름을 만들 수 있어요.'}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-sm font-semibold text-slate-900">빠른 시작</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link to="/analysis" className="rounded-2xl border border-white bg-white/60 px-4 py-3 text-sm font-semibold text-slate-900">
            행동/증상 분석하기
          </Link>
          <Link to="/diet" className="rounded-2xl border border-white bg-white/60 px-4 py-3 text-sm font-semibold text-slate-900">
            기간별 식단 만들기
          </Link>
          <Link to="/notifications" className="rounded-2xl border border-white bg-white/60 px-4 py-3 text-sm font-semibold text-slate-900">
            알림 센터 보기
          </Link>
          <Link to="/game" className="rounded-2xl border border-white bg-white/60 px-4 py-3 text-sm font-semibold text-slate-900">
            미니게임으로 학습
          </Link>
        </div>
      </section>
    </div>
  )
}
