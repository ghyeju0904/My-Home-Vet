import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'success'

export default function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
        tone === 'neutral' &&
          'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
        tone === 'info' && 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
        tone === 'warn' && 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
        tone === 'danger' && 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
        tone === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
        className,
      )}
      {...props}
    />
  )
}
