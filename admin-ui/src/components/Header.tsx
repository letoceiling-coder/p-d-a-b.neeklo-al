import { useAuth } from '../context/AuthContext'

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="font-medium text-slate-900">{user?.name}</div>
          <div className="text-xs text-slate-500">
            {user?.email} · {user?.role}
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Выйти
        </button>
      </div>
    </header>
  )
}
