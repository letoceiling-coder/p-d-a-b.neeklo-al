export const EXTRACTION_SETTINGS_KEY = 'pdab_extraction_v1'

export type CustomExtractionField = {
  id: string
  key: string
  name: string
  type: 'string' | 'number' | 'date'
}

export type ExtractionSettings = {
  selectedKeys: string[]
  customFields: CustomExtractionField[]
  extractRisks: boolean
}

export const DEFAULT_EXTRACTION_FIELDS: Array<{
  key: string
  name: string
  type: 'string' | 'number' | 'date'
}> = [
  { key: 'subject', name: 'Предмет договора', type: 'string' },
  { key: 'start_date', name: 'Дата начала', type: 'date' },
  { key: 'end_date', name: 'Дата окончания', type: 'date' },
  { key: 'contract_amount', name: 'Сумма контракта', type: 'number' },
  { key: 'unit_prices', name: 'Единичные расценки', type: 'string' },
  { key: 'payment_terms', name: 'Условия оплаты', type: 'string' },
  { key: 'payment_deadline', name: 'Срок оплаты', type: 'string' },
  {
    key: 'required_payment_docs',
    name: 'Документы для оплаты',
    type: 'string',
  },
  { key: 'inn', name: 'ИНН', type: 'string' },
  {
    key: 'application_deadline',
    name: 'Срок подачи заявки',
    type: 'string',
  },
  {
    key: 'special_account',
    name: 'Использование спец счета',
    type: 'string',
  },
  { key: 'penalties', name: 'Штрафы', type: 'string' },
  {
    key: 'termination_conditions',
    name: 'Условия расторжения',
    type: 'string',
  },
  {
    key: 'transport_requirements',
    name: 'Требования к транспорту',
    type: 'string',
  },
  {
    key: 'personnel_requirements',
    name: 'Требования к персоналу',
    type: 'string',
  },
  { key: 'licenses', name: 'Специальные разрешения', type: 'string' },
  {
    key: 'counterparty_check',
    name: 'Проверка контрагента',
    type: 'string',
  },
]

export function defaultExtractionSettings(): ExtractionSettings {
  return {
    selectedKeys: DEFAULT_EXTRACTION_FIELDS.map((f) => f.key),
    customFields: [],
    extractRisks: true,
  }
}

function normalizeLegacySettings(raw: Record<string, unknown>): ExtractionSettings {
  const defaults = defaultExtractionSettings()
  const selected = new Set<string>()
  if (raw.inn === true) selected.add('inn')
  if (raw.amount === true) selected.add('contract_amount')
  if (raw.term === true) {
    selected.add('start_date')
    selected.add('end_date')
  }
  if (raw.penalties === true) selected.add('penalties')
  if (selected.size === 0) return defaults
  return {
    selectedKeys: [...selected],
    customFields: Array.isArray(raw.customFields)
      ? (raw.customFields as CustomExtractionField[])
      : [],
    extractRisks: raw.risks !== false,
  }
}

export function loadExtractionSettings(): ExtractionSettings {
  try {
    const raw = localStorage.getItem(EXTRACTION_SETTINGS_KEY)
    if (!raw) return defaultExtractionSettings()
    const j = JSON.parse(raw) as Partial<ExtractionSettings> &
      Record<string, unknown>
    if (!Array.isArray(j.selectedKeys)) {
      return normalizeLegacySettings(j)
    }
    return {
      ...defaultExtractionSettings(),
      ...j,
      selectedKeys: Array.isArray(j.selectedKeys)
        ? j.selectedKeys.filter((k): k is string => typeof k === 'string')
        : defaultExtractionSettings().selectedKeys,
      customFields: Array.isArray(j.customFields) ? j.customFields : [],
      extractRisks: j.extractRisks !== false,
    }
  } catch {
    return defaultExtractionSettings()
  }
}

export function saveExtractionSettings(s: ExtractionSettings): void {
  localStorage.setItem(EXTRACTION_SETTINGS_KEY, JSON.stringify(s))
}

export type UploadFieldsConfig = {
  fields: Array<{ key: string; name: string; type: string }>
  extractRisks: boolean
}

/** Собирает payload для multipart `fieldsConfig`. */
export function buildUploadFieldsConfig(
  settings: ExtractionSettings
): UploadFieldsConfig | null {
  const selectedSet = new Set(settings.selectedKeys)
  const fields: UploadFieldsConfig['fields'] = []
  for (const f of DEFAULT_EXTRACTION_FIELDS) {
    if (selectedSet.has(f.key)) {
      fields.push({ key: f.key, name: f.name, type: f.type })
    }
  }
  for (const c of settings.customFields) {
    if (!c.key.trim() || !c.name.trim() || !selectedSet.has(c.key.trim())) continue
    fields.push({
      key: c.key.trim(),
      name: c.name.trim(),
      type: c.type,
    })
  }
  if (fields.length === 0) return null
  return { fields, extractRisks: settings.extractRisks }
}

export function validateExtractionSettings(settings: ExtractionSettings): string | null {
  if (!buildUploadFieldsConfig(settings)) {
    return 'Отметьте хотя бы одно поле для извлечения. Одних только рисков недостаточно — нужны данные договора.'
  }
  return null
}

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/

export function isValidCustomKey(key: string): boolean {
  return KEY_RE.test(key.trim())
}

export function suggestCustomKey(): string {
  return `extra_${Date.now().toString(36)}`
}
