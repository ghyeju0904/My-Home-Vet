import { PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-sm">
        <PawPrint className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-50">My Home Vet</div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">예방·응급대응·마음안정</div>
      </div>
    </div>
  )
}
