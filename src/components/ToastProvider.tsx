import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = {
  id: string
  title: string
  message?: string
  variant?: 'info' | 'success' | 'warning' | 'danger'
}

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const next: Toast = { id, ...toast }
    setToasts((prev) => [next, ...prev].slice(0, 3))
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={[
                'pointer-events-auto rounded-2xl border bg-white/90 p-3 shadow-lg backdrop-blur',
                t.variant === 'danger'
                  ? 'border-rose-200'
                  : t.variant === 'warning'
                    ? 'border-amber-200'
                    : t.variant === 'success'
                      ? 'border-emerald-200'
                      : 'border-slate-200',
              ].join(' ')}
            >
              <div className="text-sm font-semibold text-slate-900">{t.title}</div>
              {t.message ? <div className="text-sm text-slate-700">{t.message}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}

