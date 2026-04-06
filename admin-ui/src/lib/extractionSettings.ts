export const EXTRACTION_SETTINGS_KEY = 'pdab_extraction_v1'

export type CustomExtractionField = {
  id: string
  key: string
  name: string
  type: 'string' | 'number' | 'date'
}

export type ExtractionSettings = {
  inn: boolean
  amount: boolean
  term: boolean
  risks: boolean
  penalties: boolean
  customFields: CustomExtractionField[]
}

export function defaultExtractionSettings(): ExtractionSettings {
  return {
    inn: true,
    amount: true,
    term: true,
    risks: true,
    penalties: true,
    customFields: [],
  }
}

export function loadExtractionSettings(): ExtractionSettings {
  try {
    const raw = localStorage.getItem(EXTRACTION_SETTINGS_KEY)
    if (!raw) return defaultExtractionSettings()
    const j = JSON.parse(raw) as Partial<ExtractionSettings>
    return {
      ...defaultExtractionSettings(),
      ...j,
      customFields: Array.isArray(j.customFields) ? j.customFields : [],
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
  const fields: UploadFieldsConfig['fields'] = []
  if (settings.inn) {
    fields.push({ key: 'inn', name: 'ИНН', type: 'string' })
  }
  if (settings.amount) {
    fields.push({ key: 'amount', name: 'Сумма контракта', type: 'number' })
  }
  if (settings.term) {
    fields.push({ key: 'start_date', name: 'Дата начала', type: 'date' })
    fields.push({ key: 'end_date', name: 'Дата окончания', type: 'date' })
  }
  if (settings.penalties) {
    fields.push({
      key: 'penalties',
      name: 'Штрафы и неустойки',
      type: 'string',
    })
  }
  for (const c of settings.customFields) {
    if (!c.key.trim() || !c.name.trim()) continue
    fields.push({
      key: c.key.trim(),
      name: c.name.trim(),
      type: c.type,
    })
  }
  if (fields.length === 0) return null
  return { fields, extractRisks: settings.risks }
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
