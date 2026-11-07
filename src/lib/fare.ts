/** 금액은 1원 단위, 수수료율은 서버와 같이 소수 첫째 자리로 반올림한다. */
function rateTenths(amount: number, feeRate: number) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(feeRate) || feeRate < 0 || feeRate > 99.9) return null
  return Math.round(feeRate * 10)
}

/** 지급운임 ÷ (1 − 수수료율). 서버 Order.billedFareFor와 같은 1원 단위 반올림. */
export function billedFareFor(fare: number, feeRate: number) {
  const rate = rateTenths(fare, feeRate)
  return rate === null ? null : Math.round((fare * 1000) / (1000 - rate))
}

/** 청구운임 × (1 − 수수료율). 작은 금액도 0원으로 잘리지 않게 1원 단위로 계산한다. */
export function fareFor(billedFare: number, feeRate: number) {
  const rate = rateTenths(billedFare, feeRate)
  return rate === null ? null : Math.round((billedFare * (1000 - rate)) / 1000)
}

/** 수수료율(%) = (청구 − 지급) ÷ 청구, 소수 첫째 자리. */
export function feeRateOf(fare: number, billedFare: number) {
  if (!billedFare) return null
  return Math.round(((billedFare - fare) / billedFare) * 1000) / 10
}
