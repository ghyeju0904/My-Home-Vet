import { useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { getDeviceId } from '@/lib/device'

type Scheduled = {
  id: string
  title: string
  content: string
  scheduled_at: string
  type: string
}

function msUntil(iso: string) {
  const t = new Date(iso).getTime() - Date.now()
  return Math.max(0, t)
}

export default function NotificationScheduler() {
  const { pushToast } = useToast()
  const timersRef = useRef<Map<string, number>>(new Map())

  const canNotify = useMemo(() => typeof window !== 'undefined' && 'Notification' in window, [])

  useEffect(() => {
    const clearAll = () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current.clear()
    }

    const schedule = async () => {
      const nowIso = new Date().toISOString()
      const horizon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,content,scheduled_at,type,sent_at')
        .eq('device_id', getDeviceId())
        .is('sent_at', null)
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', nowIso)
        .lte('scheduled_at', horizon)
        .order('scheduled_at', { ascending: true })
        .limit(50)

      if (error || !data) return

      const list = data as unknown as (Scheduled & { sent_at: string | null })[]
      for (const n of list) {
        if (!n.scheduled_at) continue
        if (timersRef.current.has(n.id)) continue

        const delay = msUntil(n.scheduled_at)
        const timerId = window.setTimeout(async () => {
          timersRef.current.delete(n.id)
          await supabase.from('notifications').update({ sent_at: new Date().toISOString() }).eq('id', n.id)

          pushToast({
            title: n.title,
            message: n.content,
            variant: n.type.includes('emergency') ? 'danger' : n.type.includes('meal') ? 'success' : 'info',
          })

          if (canNotify && Notification.permission === 'granted') {
            new Notification(n.title, { body: n.content })
          }
        }, delay)

        timersRef.current.set(n.id, timerId)
      }
    }

    void schedule()
    const intervalId = window.setInterval(() => void schedule(), 60_000)

    return () => {
      window.clearInterval(intervalId)
      clearAll()
    }
  }, [pushToast, canNotify])

  return null
}
