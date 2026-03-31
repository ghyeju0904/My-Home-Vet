import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'warn' | 'danger'

export type Toast = {
  id: string
  title: string
  body?: string
  tone: ToastTone
}

function id() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

type ToastState = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'> & { ttlMs?: number }) => void
  remove: (toastId: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const toastId = id()
    const toast: Toast = { id: toastId, title: t.title, body: t.body, tone: t.tone }
    set(s => ({ toasts: [toast, ...s.toasts].slice(0, 4) }))
    const ttl = t.ttlMs ?? 6000
    window.setTimeout(() => get().remove(toastId), ttl)
  },
  remove: (toastId) => set(s => ({ toasts: s.toasts.filter(t => t.id !== toastId) })),
  clear: () => set({ toasts: [] }),
}))

