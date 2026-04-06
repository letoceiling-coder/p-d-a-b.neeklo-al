import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Header } from '../components/Header'

const titles: Record<string, string> = {
  '/app/dashboard': 'Панель',
  '/app/documents': 'Документы',
  '/app/settings/extraction': 'Настройки извлечения',
  '/app/users': 'Пользователи',
  '/app/users/new': 'Новый пользователь',
}

function titleFromPath(pathname: string): string {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/app/users/') && pathname.includes('/edit')) {
    return 'Редактирование пользователя'
  }
  if (pathname.startsWith('/app/users/') && pathname.includes('/delete')) {
    return 'Удаление пользователя'
  }
  if (pathname.startsWith('/app/documents/') && pathname.endsWith('/view')) {
    return 'Анализ договора'
  }
  if (pathname.startsWith('/app/documents/') && pathname.endsWith('/result')) {
    return 'Результат документа'
  }
  return 'Кабинет'
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = titleFromPath(pathname)

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
