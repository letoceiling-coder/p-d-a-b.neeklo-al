import type {
  DocumentDetail,
  DocumentResultResponse,
  DocumentsListResponse,
  LoginResponse,
  User,
  UsersListResponse,
} from '../types'

/** Dev: Vite proxy /api → backend. Prod: nginx /api/ → backend. */
const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'pdab_token'
const USER_KEY = 'pdab_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function buildHeaders(
  init?: RequestInit,
  token?: string | null
): HeadersInit {
  const h: Record<string, string> = {}
  const t = token ?? getToken()
  if (t) h.Authorization = `Bearer ${t}`
  const body = init?.body
  if (body && !(body instanceof FormData)) {
    h['Content-Type'] = 'application/json'
  }
  return { ...h, ...(init?.headers as Record<string, string>) }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const j = JSON.parse(text) as { error?: string; message?: string }
    return j.error || j.message || text || res.statusText
  } catch {
    return text || res.statusText
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<LoginResponse>
}

export async function fetchDocuments(): Promise<DocumentsListResponse> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<DocumentsListResponse>
}

export type UploadFieldsConfigPayload = {
  fields: Array<{ key: string; name: string; type: string }>
  extractRisks: boolean
}

export async function uploadDocument(
  file: File,
  fieldsConfig?: UploadFieldsConfigPayload | null
): Promise<{ id: string; status: string }> {
  const fd = new FormData()
  fd.append('file', file)
  if (fieldsConfig) {
    fd.append('fieldsConfig', JSON.stringify(fieldsConfig))
  }
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: buildHeaders({ body: fd }),
    body: fd,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ id: string; status: string }>
}

export async function fetchDocument(id: string): Promise<DocumentDetail> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<DocumentDetail>
}

export async function fetchDocumentResult(
  id: string
): Promise<DocumentResultResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}/result`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<DocumentResultResponse>
}

export async function fetchUsers(): Promise<UsersListResponse> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<UsersListResponse>
}

export async function createUser(body: {
  email: string
  password: string
  name: string
  role: string
}): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<User>
}

export async function updateUser(
  id: string,
  body: Partial<{ email: string; name: string; role: string; password: string }>
): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<User>
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
}
