import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchDocuments,
  uploadDocument,
} from '../api/client'
import type { DocumentRow } from '../types'
import {
  documentStatusClass,
  documentStatusLabel,
} from '../lib/documentStatus'

export function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchDocuments()
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadMsg(null)
    setUploading(true)
    try {
      await uploadDocument(file)
      setUploadMsg('Файл отправлен на обработку.')
      await load()
    } catch (err) {
      setUploadMsg(
        err instanceof Error ? err.message : 'Ошибка загрузки файла'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Загрузка документа
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Форматы: PDF или DOCX. После загрузки документ обрабатывается
          автоматически.
        </p>
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50/40">
            <span className="text-sm font-medium text-indigo-700">
              {uploading ? 'Загрузка…' : 'Выбрать файл'}
            </span>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={uploading}
              onChange={onFileChange}
            />
          </label>
        </div>
        {uploadMsg ? (
          <p className="mt-3 text-sm text-slate-700">{uploadMsg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Список документов
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
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Документов пока нет.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Статус</th>
                  <th className="px-6 py-3">Создан</th>
                  <th className="px-6 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      {d.id}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${documentStatusClass(d.status)}`}
                      >
                        {documentStatusLabel(d.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(d.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={`/app/documents/${d.id}/result`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Открыть результат
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
