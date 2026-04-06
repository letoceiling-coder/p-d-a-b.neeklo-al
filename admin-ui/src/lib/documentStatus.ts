export function documentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    UPLOADED: 'Загружен',
    PROCESSING: 'Обработка',
    DONE: 'Обработан',
    FAILED: 'Ошибка',
  }
  return map[status] ?? status
}

export function documentStatusClass(status: string): string {
  if (status === 'DONE') return 'bg-emerald-100 text-emerald-800'
  if (status === 'FAILED') return 'bg-red-100 text-red-800'
  if (status === 'PROCESSING') return 'bg-amber-100 text-amber-900'
  return 'bg-slate-100 text-slate-700'
}
