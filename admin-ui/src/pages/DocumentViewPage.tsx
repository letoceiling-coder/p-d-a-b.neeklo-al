import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDocument, fetchDocumentResult } from '../api/client'
import type { DocumentDetail, DocumentResultResponse } from '../types'
import { documentStatusLabel } from '../lib/documentStatus'

type FieldMeta = { confidence?: number; doubtful?: boolean }

type FieldDesc = { key: string; name: string }

type RiskRow = {
  text: string
  level?: string
  doubtful?: boolean
  confidence?: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

function readNestedField(
  result: Record<string, unknown>,
  key: string
): { value: string; meta?: FieldMeta } {
  const fields = result.fields
  if (fields && isRecord(fields)) {
    const cell = fields[key]
    if (cell && isRecord(cell)) {
      const value =
        cell.value != null && typeof cell.value !== 'object'
          ? String(cell.value)
          : ''
      const confidence =
        typeof cell.confidence === 'number' ? cell.confidence : undefined
      const doubtful = cell.doubtful === true
      return {
        value,
        meta:
          confidence !== undefined || doubtful
            ? { confidence, doubtful }
            : undefined,
      }
    }
  }
  const top = result[key]
  return {
    value: typeof top === 'string' ? top : '',
  }
}

/** fieldsConfig: новый объект { fields, extractRisks } или legacy-массив. */
function normalizeViewFieldsConfig(raw: unknown): {
  list: FieldDesc[]
  extractRisks: boolean
} {
  const fallback: FieldDesc[] = [
    { key: 'inn', name: 'ИНН' },
    { key: 'amount', name: 'Сумма' },
    { key: 'start_date', name: 'Дата начала' },
    { key: 'end_date', name: 'Дата окончания' },
    { key: 'payment_terms', name: 'Условия оплаты' },
  ]
  if (Array.isArray(raw)) {
    const list = raw
      .filter(
        (x): x is FieldDesc =>
          isRecord(x) &&
          typeof x.key === 'string' &&
          typeof x.name === 'string'
      )
      .map((x) => ({ key: x.key, name: x.name }))
    return { list: list.length ? list : fallback, extractRisks: true }
  }
  if (isRecord(raw) && Array.isArray(raw.fields)) {
    const list = raw.fields
      .filter(
        (x): x is FieldDesc =>
          isRecord(x) &&
          typeof x.key === 'string' &&
          typeof x.name === 'string'
      )
      .map((x) => ({ key: x.key, name: x.name }))
    return {
      list: list.length ? list : fallback,
      extractRisks: raw.extractRisks !== false,
    }
  }
  return { list: fallback, extractRisks: true }
}

function parseRisks(result: Record<string, unknown>): RiskRow[] {
  const risks: RiskRow[] = []
  if (!Array.isArray(result.risks)) return risks
  for (const x of result.risks) {
    if (typeof x === 'string') {
      const t = x.trim()
      if (t) risks.push({ text: t })
    } else if (x && isRecord(x)) {
      const text =
        typeof x.text === 'string'
          ? x.text.trim()
          : typeof x.message === 'string'
            ? x.message.trim()
            : ''
      if (!text) continue
      risks.push({
        text,
        level: typeof x.level === 'string' ? x.level : undefined,
        doubtful: x.doubtful === true,
        confidence: typeof x.confidence === 'number' ? x.confidence : undefined,
      })
    }
  }
  return risks
}

function parseExtractionMeta(result: Record<string, unknown>) {
  const m = result.meta && isRecord(result.meta) ? result.meta : null
  return {
    anyDoubtful: m?.anyDoubtful === true,
    secondPassOk: m?.secondPassOk === true,
    extractionVersion:
      typeof m?.extractionVersion === 'number'
        ? m.extractionVersion
        : undefined,
    extractRisks: m?.extractRisks !== false,
  }
}

/** Строки отчёта: порядок из настроек + остальные ключи из ответа. */
function buildReportRows(
  configList: FieldDesc[],
  result: Record<string, unknown> | null
): Array<{ key: string; name: string; value: string; meta?: FieldMeta }> {
  if (!result) return []
  const seen = new Set<string>()
  const rows: Array<{
    key: string
    name: string
    value: string
    meta?: FieldMeta
  }> = []
  for (const d of configList) {
    const r = readNestedField(result, d.key)
    rows.push({ key: d.key, name: d.name, ...r })
    seen.add(d.key)
  }
  const fields = result.fields
  if (fields && isRecord(fields)) {
    for (const key of Object.keys(fields)) {
      if (seen.has(key)) continue
      const r = readNestedField(result, key)
      rows.push({
        key,
        name: key.replace(/_/g, ' '),
        ...r,
      })
    }
  }
  return rows
}

function confidenceBadgeClass(p: number): string {
  if (p > 0.9) return 'bg-emerald-100 text-emerald-900'
  if (p >= 0.7) return 'bg-amber-100 text-amber-900'
  return 'bg-red-100 text-red-900'
}

function confidenceBarClass(p: number): string {
  if (p > 0.9) return 'bg-emerald-500'
  if (p >= 0.7) return 'bg-amber-400'
  return 'bg-red-500'
}

function overallConfidencePercent(
  rows: Array<{ meta?: FieldMeta; value: string }>
): number | null {
  const vals = rows
    .filter((r) => r.value.trim())
    .map((r) => r.meta?.confidence)
    .filter((c): c is number => typeof c === 'number')
  if (!vals.length) return null
  return Math.round(
    (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
  )
}

function riskLevelRu(level?: string): { label: string; emoji: string } {
  switch (level) {
    case 'high':
      return { label: 'Высокий', emoji: '🔴' }
    case 'low':
      return { label: 'Низкий', emoji: '🟢' }
    case 'medium':
    default:
      return { label: 'Средний', emoji: '🟡' }
  }
}

type Span = { start: number; end: number; kinds: Set<'inn' | 'amount'> }

function buildHighlightSpans(
  text: string,
  inn: string,
  amount: string
): Span[] {
  const raw: Span[] = []
  const pushMatches = (val: string, kind: 'inn' | 'amount') => {
    const v = val.trim()
    if (v.length < 2) return
    let i = 0
    while (i <= text.length) {
      const j = text.indexOf(v, i)
      if (j === -1) break
      raw.push({ start: j, end: j + v.length, kinds: new Set([kind]) })
      i = j + 1
    }
  }
  pushMatches(inn, 'inn')
  pushMatches(amount, 'amount')
  raw.sort((a, b) => a.start - b.start || b.end - a.end)

  const merged: Span[] = []
  for (const s of raw) {
    const last = merged[merged.length - 1]
    if (!last || s.start >= last.end) {
      merged.push({
        start: s.start,
        end: s.end,
        kinds: new Set(s.kinds),
      })
    } else {
      last.end = Math.max(last.end, s.end)
      s.kinds.forEach((k) => last.kinds.add(k))
    }
  }
  return merged
}

function spanClass(kinds: Set<'inn' | 'amount'>): string {
  const inn = kinds.has('inn')
  const amt = kinds.has('amount')
  if (inn && amt) return 'bg-amber-100 text-slate-900 ring-1 ring-amber-300/60'
  if (inn) return 'bg-amber-100 text-slate-900 ring-1 ring-amber-200/80'
  return 'bg-emerald-100 text-slate-900 ring-1 ring-emerald-200/80'
}

function HighlightedContractText({
  text,
  inn,
  amount,
}: {
  text: string
  inn: string
  amount: string
}) {
  const spans = useMemo(
    () => buildHighlightSpans(text, inn, amount),
    [text, inn, amount]
  )

  if (!text.trim()) {
    return (
      <p className="text-sm text-slate-500">Текст документа отсутствует.</p>
    )
  }

  if (spans.length === 0) {
    return <>{text}</>
  }

  const nodes: ReactNode[] = []
  let cursor = 0
  spans.forEach((sp, idx) => {
    if (sp.start > cursor) {
      nodes.push(
        <Fragment key={`t-${idx}-${cursor}`}>
          {text.slice(cursor, sp.start)}
        </Fragment>
      )
    }
    nodes.push(
      <mark
        key={`m-${idx}-${sp.start}`}
        className={`rounded-sm px-0.5 ${spanClass(sp.kinds)}`}
      >
        {text.slice(sp.start, sp.end)}
      </mark>
    )
    cursor = sp.end
  })
  if (cursor < text.length) {
    nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>)
  }
  return <>{nodes}</>
}

function ReportSection({
  title,
  emoji,
  children,
}: {
  title: string
  emoji: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
        <span aria-hidden className="text-lg">
          {emoji}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

export function DocumentViewPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [resultRes, setResultRes] = useState<DocumentResultResponse | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [d, r] = await Promise.all([
          fetchDocument(id),
          fetchDocumentResult(id),
        ])
        if (!cancelled) {
          setDoc(d)
          setResultRes(r)
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

  const resultObj =
    resultRes?.result && isRecord(resultRes.result) &&
    !('status' in resultRes.result) &&
    !('error' in resultRes.result)
      ? resultRes.result
      : null

  const viewCfg = normalizeViewFieldsConfig(doc?.fieldsConfig)
  const reportRows = buildReportRows(viewCfg.list, resultObj)
  const risks = resultObj ? parseRisks(resultObj) : []
  const meta = resultObj ? parseExtractionMeta(resultObj) : null

  const innHighlight = resultObj ? readNestedField(resultObj, 'inn').value : ''
  const amountHighlight = resultObj
    ? readNestedField(resultObj, 'amount').value
    : ''

  const overall = overallConfidencePercent(reportRows)

  if (!id) {
    return (
      <div className="p-6 text-center text-red-700">
        Не указан идентификатор документа.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="-m-6 flex h-[calc(100vh-6.5rem)] min-h-[320px] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Загрузка документа…
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="-m-6 flex h-[calc(100vh-6.5rem)] min-h-[320px] flex-col items-center justify-center gap-4 bg-slate-50 px-6">
        <p className="max-w-md text-center text-sm text-red-700">{error}</p>
        <Link
          to="/app/documents"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← К списку документов
        </Link>
      </div>
    )
  }

  const bodyText = doc?.text ?? ''
  const isEmptyDoc = !bodyText.trim()

  return (
    <div className="-m-6 flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col bg-slate-50">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <Link
            to="/app/documents"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Документы
          </Link>
          <p className="mt-1 truncate font-mono text-xs text-slate-500">
            {id}
          </p>
        </div>
        {resultRes ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {meta?.anyDoubtful ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                Требует внимания
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {documentStatusLabel(resultRes.status)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:divide-x lg:divide-slate-200">
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col border-b border-slate-200 bg-white lg:border-b-0 lg:flex-[3]">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Текст договора
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {isEmptyDoc ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <p className="text-sm text-slate-600">
                  Текст документа пуст или ещё не извлечён.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Дождитесь завершения обработки и обновите страницу.
                </p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-slate-800">
                <HighlightedContractText
                  text={bodyText}
                  inn={innHighlight}
                  amount={amountHighlight}
                />
              </pre>
            )}
          </div>
        </div>

        <aside className="flex min-h-0 w-full min-w-0 flex-[2] flex-col overflow-y-auto bg-slate-100/80 lg:max-w-none lg:flex-[2]">
          <div className="space-y-4 p-4">
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-sm">
              Краткий отчёт по извлечённым данным. Сверяйте важные поля с текстом
              договора слева.
            </p>

            {overall != null ? (
              <ReportSection title="Уверенность" emoji="📊">
                <div className="flex items-end gap-3">
                  <span
                    className={`text-4xl font-bold tabular-nums ${overall > 90 ? 'text-emerald-700' : overall >= 70 ? 'text-amber-700' : 'text-red-700'}`}
                  >
                    {overall}%
                  </span>
                  <span className="pb-1 text-sm text-slate-500">
                    средняя по заполненным полям
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${confidenceBarClass(overall / 100)}`}
                    style={{ width: `${Math.min(100, overall)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Выше 90% — хорошо, 70–90% — проверьте, ниже 70% — высокий
                  риск ошибки.
                </p>
              </ReportSection>
            ) : null}

            <ReportSection title="Основные данные" emoji="📄">
              <div className="space-y-3">
                {reportRows.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Нет данных для отображения.
                  </p>
                ) : (
                  reportRows.map((row) => {
                    const empty = !row.value.trim()
                    const c = row.meta?.confidence
                    const pct =
                      typeof c === 'number' && !empty
                        ? Math.round(c * 100)
                        : null
                    return (
                      <div
                        key={row.key}
                        className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {row.name}
                          </span>
                          {pct != null ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${confidenceBadgeClass(c!)}`}
                            >
                              {pct}%
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-2 text-sm leading-snug ${empty ? 'text-slate-400' : 'font-medium text-slate-900'}`}
                        >
                          {empty ? '—' : row.value}
                        </p>
                        {row.meta?.doubtful ? (
                          <p className="mt-1.5 text-xs font-medium text-amber-800">
                            Сомнительно — сверьте с оригиналом
                          </p>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </ReportSection>

            <ReportSection title="Риски" emoji="⚠️">
              {meta?.extractRisks === false ? (
                <p className="text-sm text-slate-500">
                  Анализ рисков не выполнялся (так задано при загрузке
                  документа).
                </p>
              ) : risks.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Существенные риски по тексту не выделены.
                </p>
              ) : (
                <ul className="space-y-3">
                  {risks.map((r, i) => {
                    const lv = riskLevelRu(r.level)
                    const rc =
                      typeof r.confidence === 'number' ? r.confidence : null
                    const pct = rc != null ? Math.round(rc * 100) : null
                    return (
                      <li
                        key={`${i}-${r.text.slice(0, 24)}`}
                        className={`rounded-lg border bg-white px-3 py-3 ${
                          r.level === 'high'
                            ? 'border-red-200'
                            : r.level === 'low'
                              ? 'border-emerald-200'
                              : 'border-amber-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm" aria-hidden>
                            {lv.emoji}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {lv.label}
                          </span>
                          {pct != null ? (
                            <span
                              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceBadgeClass(rc!)}`}
                            >
                              {pct}%
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-800">
                          «{r.text}»
                        </p>
                        {r.doubtful ? (
                          <p className="mt-1 text-xs text-amber-800">
                            Низкая уверенность
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </ReportSection>
          </div>
        </aside>
      </div>
    </div>
  )
}
