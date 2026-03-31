import { Link, NavLink, Outlet } from 'react-router-dom'
import { Bell, Gamepad2, HeartPulse, Home, PawPrint, Salad, Settings } from 'lucide-react'
import NotificationScheduler from '@/components/NotificationScheduler'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: '홈', icon: Home },
  { to: '/pet', label: '펫', icon: PawPrint },
  { to: '/analysis', label: '분석', icon: HeartPulse },
  { to: '/diet', label: '식단', icon: Salad },
  { to: '/notifications', label: '알림', icon: Bell },
  { to: '/game', label: '게임', icon: Gamepad2 },
  { to: '/settings', label: '설정', icon: Settings },
]

export default function Shell() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#FFF5E6] via-white to-[#A8E6CF]/20">
      <NotificationScheduler />
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-2xl bg-[#FF8B94]/20 text-[#FF8B94]">
              <PawPrint className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">My Home Vet</div>
              <div className="text-xs text-slate-600">예방 중심 · 응급 대응 보조</div>
            </div>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl gap-4 px-4 py-4">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-[72px] flex flex-col gap-1 rounded-3xl border border-white/70 bg-white/70 p-2 backdrop-blur">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold',
                    isActive ? 'bg-[#A8E6CF]/30 text-slate-900' : 'text-slate-700 hover:bg-white',
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="w-full">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/80 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-2 py-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold',
                  isActive ? 'bg-[#FF8B94]/15 text-slate-900' : 'text-slate-600',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-20 md:hidden" />
    </div>
  )
}
