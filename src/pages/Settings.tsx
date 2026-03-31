import { useToast } from '@/components/ToastProvider'

export default function Settings() {
  const { pushToast } = useToast()

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      pushToast({ title: '이 브라우저는 알림을 지원하지 않아요.', variant: 'warning' })
      return
    }
    const p = await Notification.requestPermission()
    pushToast({ title: '알림 권한', message: p === 'granted' ? '허용됨' : '차단됨', variant: p === 'granted' ? 'success' : 'warning' })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-lg font-semibold text-slate-900">설정</div>
        <div className="mt-1 text-sm text-slate-700">알림 권한과 기본 옵션을 관리해요.</div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-sm font-semibold text-slate-900">알림</div>
        <div className="mt-2 text-sm text-slate-700">브라우저 알림을 허용하면 식사/간식 알림을 더 잘 받을 수 있어요.</div>
        <button
          type="button"
          onClick={() => void requestPermission()}
          className="mt-3 rounded-2xl bg-[#A8E6CF]/40 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          알림 권한 요청
        </button>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-5 backdrop-blur">
        <div className="text-sm font-semibold text-slate-900">주의</div>
        <div className="mt-2 text-sm text-slate-700">이 서비스는 진단을 대체하지 않으며, 위급 상황에서는 즉시 동물병원에 연락해 주세요.</div>
      </section>
    </div>
  )
}

