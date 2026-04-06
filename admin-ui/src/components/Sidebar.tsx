import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass =
  'block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
const activeClass = 'bg-indigo-50 text-indigo-900 hover:bg-indigo-50'

export function Sidebar() {
  const { canManageUsers } = useAuth()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Кабинет
        </div>
        <div className="text-lg font-semibold text-slate-900">Документы</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ''}`
          }
        >
          Панель
        </NavLink>
        <NavLink
          to="/app/documents"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ''}`
          }
        >
          Документы
        </NavLink>
        {canManageUsers ? (
          <NavLink
            to="/app/users"
            className={({ isActive }) =>
              `${linkClass} ${isActive ? activeClass : ''}`
            }
          >
            Пользователи
          </NavLink>
        ) : null}
      </nav>
    </aside>
  )
}
