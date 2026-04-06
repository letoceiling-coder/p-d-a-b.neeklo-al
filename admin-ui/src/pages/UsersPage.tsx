import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers } from '../api/client'
import type { User } from '../types'

export function UsersPage() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchUsers()
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-600">
          Управление учётными записями и ролями.
        </p>
        <Link
          to="/app/users/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Создать пользователя
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Пользователи
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Загрузка…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Имя</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Роль</th>
                  <th className="px-6 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3 text-slate-600">{u.role}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={`/app/users/${u.id}/edit`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Изменить
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
