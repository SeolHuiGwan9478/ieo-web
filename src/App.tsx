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

/** 로그인 안 했으면 로그인으로, 소속 회사가 없으면 회사 등록으로 */
function RequireCompany() {
  const { loggedIn, loadingMe, noCompany } = useAuth()
  if (!loggedIn) return <Navigate to="/login" replace />
  if (loadingMe) return <FullPageMessage>불러오는 중…</FullPageMessage>
  if (noCompany) return <Navigate to="/register" replace />
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
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
