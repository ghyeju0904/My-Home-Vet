const DEVICE_ID_KEY = 'myhomevet:device_id_v1'

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server'
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

