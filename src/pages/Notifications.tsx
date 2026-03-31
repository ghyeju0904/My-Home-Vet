import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { NotificationRow } from '@/lib/types'
import { useToast } from '@/components/ToastProvider'
import { getDeviceId } from '@/lib/device'

export default function Notifications() {
  const { pushToast } = useToast()
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('device_id', getDeviceId())
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(200)

    setLoading(false)
    if (error) {
      pushToast({ title: '불러오기 실패', message: error.message, variant: 'danger' })
      return
    }
    setRows((data as NotificationRow[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      pushToast({ title: '이 브라우저는 알림을 지원하지 않아요.', variant: 'warning' })
      return
    }
    const p = await Notification.requestPermission()
    pushToast({ title: '알림 권한', message: p === 'granted' ? '허용됨' : '차단됨', variant: p === 'granted' ? 'success' : 'warning' })
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">알림 센터</div>
            <div className="mt-1 text-sm text-slate-700">식사/간식/케어 알림으로 규칙적인 루틴을 만들어요.</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void requestPermission()}
              className="rounded-2xl bg-[#A8E6CF]/40 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              알림 허용
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              새로고침
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        {loading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}
        {!loading && rows.length === 0 ? <div className="text-sm text-slate-700">알림이 없어요.</div> : null}
        <div className="space-y-2">
          {rows.map((n) => (
            <div key={n.id} className="rounded-2xl border border-white bg-white/60 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                  <div className="text-sm text-slate-700">{n.content}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    예정: {n.scheduled_at ? new Date(n.scheduled_at).toLocaleString() : '-'} · 발송: {n.sent_at ? '완료' : '대기'} · 읽음:{' '}
                    {n.read_at ? '완료' : '미확인'}
                  </div>
                </div>
                {!n.read_at ? (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    읽음
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
