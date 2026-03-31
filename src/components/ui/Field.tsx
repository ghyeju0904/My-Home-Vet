import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function FieldLabel({
  className,
  children,
  hint,
}: {
  className?: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{children}</div>
      {hint ? <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl bg-white/80 px-4 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-violet-400 dark:bg-slate-950/40 dark:text-slate-50 dark:ring-slate-700 dark:focus:ring-violet-500',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-violet-400 dark:bg-slate-950/40 dark:text-slate-50 dark:ring-slate-700 dark:focus:ring-violet-500',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  ...props
}: InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-2xl bg-white/80 px-4 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-violet-400 dark:bg-slate-950/40 dark:text-slate-50 dark:ring-slate-700 dark:focus:ring-violet-500',
        className,
      )}
      {...props}
    />
  )
}

export function FieldHelp({ className, ...props }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...props} />
}
