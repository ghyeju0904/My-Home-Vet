import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cat, Dog, PawPrint } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import type { Pet, Species } from '@/lib/types'
import { getDeviceId } from '@/lib/device'

const LOCAL_PETS_KEY = 'myhomevet:local_pets_v1'

function loadLocalPets(): Pet[] {
  try {
    const raw = localStorage.getItem(LOCAL_PETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Pet[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalPets(pets: Pet[]) {
  try {
    localStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(pets))
  } catch {
    return
  }
}

function makeLocalPet(input: {
  name: string
  species: Species
  breed: string | null
  age_years: number | null
  weight_kg: number | null
  is_neutered: boolean
  allergies: string[]
}): Pet {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: null,
    device_id: getDeviceId(),
    name: input.name,
    species: input.species,
    breed: input.breed,
    age_years: input.age_years,
    weight_kg: input.weight_kg,
    gender: null,
    is_neutered: input.is_neutered,
    last_checkup_date: null,
    routine: {},
    allergies: input.allergies,
    health_conditions: [],
    created_at: now,
    updated_at: now,
  }
}

function normalizePet(row: unknown): Pet {
  const p = row as Partial<Pet> & Record<string, unknown>
  const now = new Date().toISOString()
  const species = (p.species as Species) ?? 'dog'
  return {
    id: String(p.id ?? crypto.randomUUID()),
    user_id: typeof p.user_id === 'string' ? p.user_id : null,
    device_id: typeof p.device_id === 'string' && p.device_id ? p.device_id : getDeviceId(),
    name: String(p.name ?? ''),
    species,
    breed: (p.breed as string | null) ?? null,
    age_years: typeof p.age_years === 'number' ? p.age_years : p.age_years == null ? null : Number(p.age_years),
    weight_kg: typeof p.weight_kg === 'number' ? p.weight_kg : p.weight_kg == null ? null : Number(p.weight_kg),
    gender: (p.gender as Pet['gender']) ?? null,
    is_neutered: Boolean(p.is_neutered),
    last_checkup_date: (p.last_checkup_date as string | null) ?? null,
    routine: (p.routine as Record<string, unknown>) ?? {},
    allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
    health_conditions: Array.isArray(p.health_conditions) ? (p.health_conditions as unknown[]) : [],
    created_at: typeof p.created_at === 'string' ? p.created_at : now,
    updated_at: typeof p.updated_at === 'string' ? p.updated_at : now,
  }
}

function SpeciesMark({ species }: { species: Species }) {
  const Icon = species === 'cat' ? Cat : species === 'dog' ? Dog : PawPrint
  const tone =
    species === 'cat'
      ? 'bg-violet-100 text-violet-700 ring-violet-200'
      : species === 'dog'
        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200'
  return (
    <div className={`grid size-9 place-items-center rounded-2xl ring-1 ${tone}`}>
      <Icon className="size-5" />
    </div>
  )
}

export default function PetHub() {
  const { pushToast } = useToast()
  const [pets, setPets] = useState<Pet[]>(() => (typeof window === 'undefined' ? [] : loadLocalPets()))
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('dog')
  const [breed, setBreed] = useState('')
  const [ageYears, setAgeYears] = useState<number | ''>('')
  const [weightKg, setWeightKg] = useState<number | ''>('')
  const [isNeutered, setIsNeutered] = useState(false)
  const [allergies, setAllergies] = useState('')

  const canSubmit = useMemo(() => name.trim().length > 0, [name])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('device_id', getDeviceId())
      .order('created_at', { ascending: true })

    setLoading(false)
    if (error) {
      setPets(loadLocalPets())
      pushToast({ title: '불러오기 실패', message: error.message, variant: 'danger' })
      return
    }

    const list = ((data as unknown[]) ?? []).map(normalizePet)
    setPets(list)
    saveLocalPets(list)
  }, [pushToast])

  useEffect(() => {
    void load()
  }, [load])

  const addPet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const allergyList = allergies
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const payload = {
      device_id: getDeviceId(),
      user_id: null,
      name: name.trim(),
      species,
      breed: breed.trim() || null,
      age_years: ageYears === '' ? null : Number(ageYears),
      weight_kg: weightKg === '' ? null : Number(weightKg),
      is_neutered: isNeutered,
      allergies: allergyList,
      routine: {},
      health_conditions: [],
    } as Record<string, unknown>

    const { data: inserted, error } = await supabase.from('pets').insert(payload).select('*').single()

    if (error) {
      const nextLocal = makeLocalPet({
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        age_years: ageYears === '' ? null : Number(ageYears),
        weight_kg: weightKg === '' ? null : Number(weightKg),
        is_neutered: isNeutered,
        allergies: allergyList,
      })
      setPets((prev) => {
        const merged = [...prev, nextLocal]
        saveLocalPets(merged)
        return merged
      })
      pushToast({ title: '로컬로 등록했어요', message: error.message, variant: 'warning' })
      setName('')
      setBreed('')
      setAgeYears('')
      setWeightKg('')
      setIsNeutered(false)
      setAllergies('')
      return
    }

    pushToast({ title: '등록 완료', message: '이제 분석/식단을 시작할 수 있어요.', variant: 'success' })
    setName('')
    setBreed('')
    setAgeYears('')
    setWeightKg('')
    setIsNeutered(false)
    setAllergies('')

    if (inserted) {
      const normalized = normalizePet(inserted)
      setPets((prev) => {
        const merged = [...prev, normalized]
        saveLocalPets(merged)
        return merged
      })
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-lg font-semibold text-slate-900">반려동물 관리</div>
        <div className="mt-1 text-sm text-slate-700">정보가 정확할수록 분석/식단 추천 정확도가 좋아져요.</div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="text-sm font-semibold text-slate-900">등록된 반려동물</div>
          {loading ? (
            <div className="mt-3 text-sm text-slate-600">불러오는 중...</div>
          ) : pets.length === 0 ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white bg-white/60 px-3 py-3">
              <div className="grid size-9 place-items-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                <PawPrint className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">없음</div>
                <div className="text-xs text-slate-600">새 반려동물을 등록하면 여기에 표시돼요.</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {pets.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-2xl border border-white bg-white/60 px-3 py-2">
                  <SpeciesMark species={p.species} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-600">
                      {p.breed ?? '품종 미입력'} · {p.age_years ?? '-'}세 · {p.weight_kg ?? '-'}kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
          <div className="text-sm font-semibold text-slate-900">새 반려동물 등록</div>
          <form onSubmit={addPet} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">이름</div>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">종류</div>
                <select
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as Species)}
                >
                  <option value="dog">강아지</option>
                  <option value="cat">고양이</option>
                  <option value="other">기타</option>
                </select>
              </label>
            </div>

            <label className="block">
              <div className="text-xs font-semibold text-slate-700">품종(선택)</div>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="예: 말티즈, 코리안숏헤어"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">나이(세, 선택)</div>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value === '' ? '' : Number(e.target.value))}
                  type="number"
                  min={0}
                />
              </label>
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">체중(kg, 선택)</div>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                  type="number"
                  min={0}
                  step={0.1}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={isNeutered} onChange={(e) => setIsNeutered(e.target.checked)} />
              중성화 완료
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-slate-700">알레르기(쉼표로 구분, 선택)</div>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="예: 닭, 소고기"
              />
            </label>

            <button
              disabled={!canSubmit}
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              등록하기
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
