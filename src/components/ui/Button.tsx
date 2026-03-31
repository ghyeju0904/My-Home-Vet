import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-base',
        variant === 'primary' &&
          'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-sm hover:from-pink-500/95 hover:to-violet-500/95',
        variant === 'secondary' &&
          'bg-white/70 text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-white dark:bg-slate-900/60 dark:text-slate-50 dark:ring-slate-700',
        variant === 'ghost' &&
          'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60',
        variant === 'danger' &&
          'bg-red-600 text-white shadow-sm hover:bg-red-600/90',
        className,
      )}
      {...props}
    />
  )
}
