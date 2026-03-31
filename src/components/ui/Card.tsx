import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/60 dark:ring-slate-700',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50', className)}
      {...props}
    />
  )
}

export function CardDesc({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-600 dark:text-slate-300', className)} {...props} />
  )
}
