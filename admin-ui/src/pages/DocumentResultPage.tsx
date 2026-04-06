import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDocumentResult } from '../api/client'
import type { DocumentResultResponse } from '../types'
import { documentStatusLabel } from '../lib/documentStatus'

export function DocumentResultPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<DocumentResultResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDocumentResult(id)
        if (!cancelled) setData(res)
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/app/documents"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Назад к списку документов
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Результат извлечения
        </h2>
        {id ? (
          <p className="mt-1 font-mono text-xs text-slate-500">ID: {id}</p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-slate-500">Загрузка…</p>
        ) : error ? (
          <p className="mt-6 text-red-700">{error}</p>
        ) : data ? (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Статус:</span>{' '}
              {documentStatusLabel(data.status)}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-800">
                JSON
              </div>
              <pre className="max-h-[480px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
                {JSON.stringify(data.result, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
