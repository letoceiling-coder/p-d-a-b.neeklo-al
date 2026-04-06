import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { user, canManageUsers } = useAuth()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Здравствуйте, {user?.name}
        </h2>
        <p className="mt-2 text-slate-600">
          Вы вошли как <span className="font-medium">{user?.role}</span>.
          Загружайте договоры и просматривайте извлечённые данные в разделе
          «Документы».
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/app/documents"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Перейти к документам
          </Link>
          {canManageUsers ? (
            <Link
              to="/app/users"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Управление пользователями
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  )
}
