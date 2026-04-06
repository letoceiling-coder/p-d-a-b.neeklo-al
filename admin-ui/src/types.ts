export type Role = 'USER' | 'MANAGER' | 'ADMIN' | 'DEVELOPER'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface DocumentRow {
  id: string
  userId: string
  filePath: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DocumentsListResponse {
  items: DocumentRow[]
}

export interface DocumentResultResponse {
  documentId: string
  status: string
  result: unknown
}

export interface UsersListResponse {
  items: User[]
}
