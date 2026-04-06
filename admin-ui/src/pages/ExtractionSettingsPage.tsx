import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  defaultExtractionSettings,
  loadExtractionSettings,
  saveExtractionSettings,
  type CustomExtractionField,
  type ExtractionSettings,
  isValidCustomKey,
  suggestCustomKey,
} from '../lib/extractionSettings'

const PRESETS: Array<{
  key: keyof Pick<
    ExtractionSettings,
    'inn' | 'amount' | 'term' | 'risks' | 'penalties'
  >
  label: string
  hint: string
}> = [
  { key: 'inn', label: 'ИНН', hint: 'Идентификационный номер стороны' },
  { key: 'amount', label: 'Сумма', hint: 'Сумма контракта / цена' },
  { key: 'term', label: 'Срок', hint: 'Даты начала и окончания' },
  { key: 'risks', label: 'Риски', hint: 'Анализ рисков в отчёте' },
  { key: 'penalties', label: 'Штрафы', hint: 'Неустойки и штрафные санкции' },
]

export function ExtractionSettingsPage() {
  const [settings, setSettings] = useState<ExtractionSettings>(
    defaultExtractionSettings
  )
  const [newName, setNewName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState<'string' | 'number' | 'date'>(
    'string'
  )
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    setSettings(loadExtractionSettings())
  }, [])

  const persist = useCallback((next: ExtractionSettings) => {
    setSettings(next)
    saveExtractionSettings(next)
  }, [])

  function toggle(
    key: keyof Pick<
      ExtractionSettings,
      'inn' | 'amount' | 'term' | 'risks' | 'penalties'
    >
  ) {
    persist({ ...settings, [key]: !settings[key] })
  }

  function removeCustom(id: string) {
    persist({
      ...settings,
      customFields: settings.customFields.filter((c) => c.id !== id),
    })
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    const name = newName.trim()
    const key = (newKey.trim() || suggestCustomKey()).toLowerCase()
    if (!name) {
      setAddError('Укажите название поля')
      return
    }
    if (!isValidCustomKey(key)) {
      setAddError(
        'Ключ: латиница, начало с буквы, только a-z, цифры и _ (до 64 символов)'
      )
      return
    }
    if (settings.customFields.some((c) => c.key === key)) {
      setAddError('Такой ключ уже есть')
      return
    }
    const row: CustomExtractionField = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      name,
      type: newType,
    }
    persist({
      ...settings,
      customFields: [...settings.customFields, row],
    })
    setNewName('')
    setNewKey('')
    setNewType('string')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/app/documents"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← К документам
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          Извлечение из договоров
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Выберите, какие данные передавать в ИИ при загрузке файла. Настройки
          сохраняются в браузере и отправляются на сервер вместе с документом.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          Что извлекать
        </h3>
        <ul className="mt-4 space-y-4">
          {PRESETS.map((p) => (
            <li
              key={p.key}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3"
            >
              <input
                type="checkbox"
                id={`ex-${p.key}`}
                checked={settings[p.key]}
                onChange={() => toggle(p.key)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor={`ex-${p.key}`} className="cursor-pointer">
                <span className="font-medium text-slate-900">{p.label}</span>
                <p className="text-sm text-slate-500">{p.hint}</p>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Свои поля
          </h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Дополнительные поля с произвольным названием и типом.
        </p>

        {settings.customFields.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {settings.customFields.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">
                    {c.key}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    ({c.type})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Пока нет своих полей.</p>
        )}

        <form
          onSubmit={addCustom}
          className="mt-5 space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4"
        >
          <div className="text-sm font-medium text-slate-800">
            ➕ Добавить поле
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Название
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Номер договора"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Ключ JSON (латиница)
              </label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Авто, если пусто"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500">
                Тип
              </label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as 'string' | 'number' | 'date')
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="string">Текст</option>
                <option value="number">Число</option>
                <option value="date">Дата</option>
              </select>
            </div>
          </div>
          {addError ? (
            <p className="text-sm text-red-600">{addError}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Добавить
          </button>
        </form>
      </section>
    </div>
  )
}
