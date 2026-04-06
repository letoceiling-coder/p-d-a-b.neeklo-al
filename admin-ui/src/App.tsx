import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentResultPage } from './pages/DocumentResultPage'
import { UsersPage } from './pages/UsersPage'
import { UserCreatePage } from './pages/UserCreatePage'
import { UserEditPage } from './pages/UserEditPage'
import { UserDeletePage } from './pages/UserDeletePage'

function ProtectedShell() {
  const { token, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Загрузка…
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function StaffShell() {
  const { canManageUsers } = useAuth()
  if (!canManageUsers) {
    return <Navigate to="/app/dashboard" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id/result" element={<DocumentResultPage />} />

          <Route element={<StaffShell />}>
            <Route path="users" element={<UsersPage />} />
            <Route path="users/new" element={<UserCreatePage />} />
            <Route path="users/:id/edit" element={<UserEditPage />} />
            <Route path="users/:id/delete" element={<UserDeletePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}
