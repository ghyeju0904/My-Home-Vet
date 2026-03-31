import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'

export default function Toasts() {
  const toasts = useToastStore(s => s.toasts)
  const remove = useToastStore(s => s.remove)

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => remove(t.id)}
          className={cn(
            'pointer-events-auto rounded-2xl p-3 text-left shadow-sm ring-1 backdrop-blur transition hover:translate-y-[-1px]',
            t.tone === 'info' && 'bg-white/80 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-700',
            t.tone === 'success' && 'bg-emerald-50/90 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30',
            t.tone === 'warn' && 'bg-amber-50/90 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30',
            t.tone === 'danger' && 'bg-red-50/90 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30',
          )}
        >
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{t.title}</div>
          {t.body ? <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{t.body}</div> : null}
        </button>
      ))}
    </div>
  )
}

