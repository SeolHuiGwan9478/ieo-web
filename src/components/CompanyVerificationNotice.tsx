import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Icon } from './ui'

/**
 * 회사 서류(사업자등록증·운송주선사업 허가증)가 아직 승인되지 않은 주선사에게 보이는 안내 (07 인계서 13장).
 * 승인 전에는 오더를 올릴 수 없어서, 서류를 올리는 설정 화면으로 보낸다. 인증된 회사에는 아무것도 그리지 않는다
 */
export function CompanyVerificationNotice() {
  const { me } = useAuth()
  if (!me || me.verified) return null
  return (
    <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-yellow/40 bg-status-yellow-bg px-4 py-3 text-[14px] text-ink-strong">
      <span className="flex items-center gap-2">
        <Icon name="alert" className="h-4 w-4 shrink-0 text-status-yellow" />
        회사 서류 심사가 끝나야 오더를 올릴 수 있어요. 사업자등록증과 운송주선사업 허가증을 올리면 이에오 운영자가 확인해요.
      </span>
      <Link to="/settings" className="shrink-0 text-[13.5px] font-bold text-orange-700 underline underline-offset-2">
        회사 서류 올리기
      </Link>
    </div>
  )
}
