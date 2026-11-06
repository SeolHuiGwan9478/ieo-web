/** 화면 표기. 시각은 서버에서 UTC(ISO)로 오고 한국 시간으로 보여 준다 */

const KST = 'Asia/Seoul'

export function formatDateTime(iso: string | null | undefined, options: { seconds?: boolean } = {}) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options.seconds ? '2-digit' : undefined,
    hour12: false,
  }).format(new Date(iso))
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(iso))
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

/** 몇 분 전 / 몇 시간 뒤 */
export function formatRelative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '-'
  const diff = Math.round((new Date(iso).getTime() - now) / 60_000)
  const abs = Math.abs(diff)
  const unit = abs < 60 ? `${abs}분` : abs < 60 * 24 ? `${Math.round(abs / 60)}시간` : `${Math.round(abs / 60 / 24)}일`
  if (abs < 1) return '지금'
  return diff < 0 ? `${unit} 전` : `${unit} 뒤`
}

export function formatWon(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return `${value.toLocaleString('ko-KR')}원`
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '-'
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '-'
  return phone.length === 11 ? `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}` : phone
}

export function formatBusinessNumber(value: string) {
  return value.length === 10 ? `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}` : value
}

export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '-' : `${value}%`
}

/** datetime-local 입력값(브라우저 로컬 = 한국) → ISO UTC */
export function localInputToIso(value: string) {
  return new Date(value).toISOString()
}

/** 지금부터 hours시간 뒤를 datetime-local 형식으로 */
export function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function todayIso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
