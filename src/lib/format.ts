/** 화면 표기. 시각은 서버에서 UTC(ISO)로 오고 한국 시간으로 보여 준다 */

const KST = 'Asia/Seoul'

/** 한국 시간의 연·월·일·시·분을 두 자리 문자열로 */
function kstParts(iso: string) {
  const parts: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('en-GB', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date(iso))) {
    parts[p.type] = p.value
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour === '24' ? '00' : parts.hour, minute: parts.minute, second: parts.second }
}

/** 11.09 12:49 꼴. 표·카드 어디서나 같은 폭이라 눈으로 맞추기 쉽다. 연도는 안 보여 준다 (지난해 건은 formatDate) */
export function formatDateTime(iso: string | null | undefined, options: { seconds?: boolean } = {}) {
  if (!iso) return '-'
  const p = kstParts(iso)
  return `${p.month}.${p.day} ${p.hour}:${p.minute}${options.seconds ? `:${p.second}` : ''}`
}

/** 2026.11.09 꼴 */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  const p = kstParts(iso)
  return `${p.year}.${p.month}.${p.day}`
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

/** 목록·숫자 타일용 짧은 금액. 차량 앱과 같은 "45만 원" 꼴. 1만 원 미만은 원 단위, 그 위는 만 단위(소수 첫째 자리까지) */
export function formatWonShort(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  const abs = Math.abs(value)
  if (abs < 10_000) return `${value.toLocaleString('ko-KR')}원`
  const man = Math.round((value / 10_000) * 10) / 10
  const text = Number.isInteger(man) ? man.toLocaleString('ko-KR') : man.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${text}만 원`
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
