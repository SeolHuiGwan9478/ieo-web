import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { AppLayout } from './layout/AppLayout'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { CompanyRegisterPage } from './pages/CompanyRegisterPage'
import { HomePage } from './pages/HomePage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { OrderNewPage } from './pages/orders/OrderNewPage'
import { OrderDetailPage } from './pages/orders/OrderDetailPage'
import { TripsPage } from './pages/trips/TripsPage'
import { TripDetailPage } from './pages/trips/TripDetailPage'
import { DriversPage } from './pages/DriversPage'
import { MembersPage } from './pages/MembersPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { RequireAdmin } from './admin/RequireAdmin'
import { REVIEW_KINDS } from './admin/reviewKinds'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage'
import { AdminReviewDetailPage } from './pages/admin/AdminReviewDetailPage'
import { AdminSuspectedOrdersPage } from './pages/admin/AdminSuspectedOrdersPage'

/** 로그인 안 했으면 로그인으로, 소속 회사가 없으면 회사 등록으로 */
function RequireCompany() {
  const { loggedIn, loadingMe, noCompany, meError, logout } = useAuth()
  if (!loggedIn) return <Navigate to="/login" replace />
  if (loadingMe) return <FullPageMessage>불러오는 중…</FullPageMessage>
  if (noCompany) return <Navigate to="/register" replace />
  // 회사에서 나온 계정처럼 내 회사를 읽지 못하면 모든 목록이 비어 보이므로, 이유를 알리고 다른 계정으로 들어가게 한다
  if (meError) {
    return (
      <FullPageMessage>
        <div className="text-center">
          <p>{meError}</p>
          <button onClick={logout} className="mt-3 text-[14px] font-semibold text-orange-700 underline underline-offset-2">
            다른 계정으로 로그인
          </button>
        </div>
      </FullPageMessage>
    )
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function RequireLoginOnly() {
  const { loggedIn, loadingMe, noCompany } = useAuth()
  if (!loggedIn) return <Navigate to="/login" replace />
  if (loadingMe) return <FullPageMessage>불러오는 중…</FullPageMessage>
  if (!noCompany) return <Navigate to="/" replace />
  return <Outlet />
}

function PublicOnly() {
  const { loggedIn } = useAuth()
  return loggedIn ? <Navigate to="/" replace /> : <Outlet />
}

export function FullPageMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-[15px] text-ink-sub">{children}</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage lang="ko" />} />
      <Route path="/landing/en" element={<LandingPage lang="en" />} />
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireLoginOnly />}>
        <Route path="/register" element={<CompanyRegisterPage />} />
      </Route>
      <Route element={<RequireCompany />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderNewPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/orders/:orderId/edit" element={<OrderNewPage mode="edit" />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      {/* 이에오 운영자 페이지. 주선사 콘솔과 로그인·토큰이 따로다 (07 운영자 서류심사 인계). 차주 심사와 주선사 심사는 같은 페이지에 설정만 다르다 */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<RequireAdmin />}>
        <Route index element={<Navigate to="/admin/reviews" replace />} />
        <Route path="reviews" element={<AdminReviewsPage config={REVIEW_KINDS.driver} />} />
        <Route path="drivers/:id" element={<AdminReviewDetailPage config={REVIEW_KINDS.driver} />} />
        <Route path="brokers" element={<AdminReviewsPage config={REVIEW_KINDS.broker} />} />
        <Route path="brokers/:id" element={<AdminReviewDetailPage config={REVIEW_KINDS.broker} />} />
        <Route path="suspected-orders" element={<AdminSuspectedOrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
