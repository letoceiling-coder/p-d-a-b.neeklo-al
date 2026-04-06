import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchUsers, updateUser } from '../api/client'
import type { Role, User } from '../types'

const ROLES: Role[] = ['USER', 'MANAGER', 'ADMIN', 'DEVELOPER']

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('USER')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchUsers()
        const u = res.items.find((x) => x.id === id)
        if (!u) {
          if (!cancelled) setError('Пользователь не найден')
          return
        }
        if (!cancelled) {
          setUser(u)
          setEmail(u.email)
          setName(u.name)
          setRole(u.role)
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setError(null)
    setSaving(true)
    try {
      const body: {
        email: string
        name: string
        role: string
        password?: string
      } = {
        email: email.trim(),
        name: name.trim(),
        role,
      }
      if (password.trim()) body.password = password
      await updateUser(id, body)
      navigate('/app/users', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          to="/app/users"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← К списку пользователей
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Редактирование пользователя
        </h2>
        {user ? (
          <p className="mt-1 font-mono text-xs text-slate-500">ID: {user.id}</p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-slate-500">Загрузка…</p>
        ) : error && !user ? (
          <p className="mt-6 text-red-700">{error}</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Имя
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Роль
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Новый пароль (оставьте пустым, чтобы не менять)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <Link
                to="/app/users"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Отмена
              </Link>
              {id ? (
                <Link
                  to={`/app/users/${id}/delete`}
                  className="ml-auto rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50"
                >
                  Удалить…
                </Link>
              ) : null}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
