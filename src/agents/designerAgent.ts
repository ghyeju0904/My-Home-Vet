export type DesignerTone = {
  appTagline: string
  disclaimerShort: string
  disclaimerLong: string
  emergencyBannerTitle: string
  emergencyBannerBody: string
}

export function getDesignerTone(): DesignerTone {
  return {
    appTagline: '예방은 매일, 응급대응은 빠르게, 마음은 편안하게',
    disclaimerShort: '이 결과는 참고용 가이드이며 진단이 아닙니다.',
    disclaimerLong:
      '이 서비스는 참고용 가이드이며 수의학적 진단을 대체하지 않습니다. 위급 징후가 있거나 상태가 빠르게 악화되면 즉시 24시간 동물병원/응급 진료에 연락하세요.',
    emergencyBannerTitle: '위급 가능성 신호가 보여요',
    emergencyBannerBody: '지금은 앱 가이드보다 응급 진료가 우선입니다. 가능한 한 빨리 동물병원/응급실에 연락하세요.',
  }
}
