import { useEffect, useMemo, useRef } from 'react'
import { useCareStore } from '@/stores/careStore'
import { useToastStore } from '@/stores/toastStore'

type TimerMap = Map<string, number>

export function useReminderEngine() {
  const reminders = useCareStore(s => s.reminders)
  const enabled = useCareStore(s => s.notificationsEnabled)
  const pushToast = useToastStore(s => s.push)

  const timersRef = useRef<TimerMap>(new Map())

  const upcoming = useMemo(() => {
    const now = Date.now()
    return reminders.filter(r => r.fireAt > now).sort((a, b) => a.fireAt - b.fireAt)
  }, [reminders])

  useEffect(() => {
    for (const [, timerId] of timersRef.current.entries()) {
      window.clearTimeout(timerId)
    }
    timersRef.current.clear()

    if (!enabled) return

    const now = Date.now()
    const maxToSchedule = 200
    for (const r of upcoming.slice(0, maxToSchedule)) {
      const delay = Math.max(0, r.fireAt - now)
      const timerId = window.setTimeout(() => {
        const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted'
        if (canNotify) {
          new Notification(r.title, { body: r.body })
        } else {
          pushToast({ title: r.title, body: r.body, tone: 'info' })
        }
      }, delay)
      timersRef.current.set(r.id, timerId)
    }
  }, [enabled, pushToast, upcoming])
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported' as const
  if (Notification.permission === 'granted') return 'granted' as const
  if (Notification.permission === 'denied') return 'denied' as const
  const res = await Notification.requestPermission()
  return res as 'granted' | 'denied' | 'default'
}

