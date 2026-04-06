import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteUser, fetchUsers } from '../api/client'
import type { User } from '../types'
import { useAuth } from '../context/AuthContext'

export function UserDeletePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [target, setTarget] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetchUsers()
        const u = res.items.find((x) => x.id === id)
        if (!cancelled) setTarget(u ?? null)
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

  const isSelf = id === currentUser?.id

  async function handleDelete() {
    if (!id || isSelf) return
    setError(null)
    setDeleting(true)
    try {
      await deleteUser(id)
      navigate('/app/users', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          to={id ? `/app/users/${id}/edit` : '/app/users'}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Назад
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900">
          Удаление пользователя
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Это действие нельзя отменить. Учётная запись будет удалена безвозвратно.
        </p>

        {loading ? (
          <p className="mt-6 text-slate-500">Загрузка…</p>
        ) : isSelf ? (
          <p className="mt-6 text-red-700">
            Нельзя удалить собственную учётную запись.
          </p>
        ) : !target ? (
          <p className="mt-6 text-red-700">Пользователь не найден.</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="font-medium text-slate-900">{target.name}</div>
              <div className="text-slate-600">{target.email}</div>
              <div className="text-slate-500">Роль: {target.role}</div>
            </div>
            {error ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Удаление…' : 'Удалить навсегда'}
              </button>
              <Link
                to="/app/users"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Отмена
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
