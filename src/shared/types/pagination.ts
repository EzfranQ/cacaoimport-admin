/**
 * Tipos genéricos para paginación reutilizable en toda la aplicación
 */

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Resultado paginado genérico
 */
export interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Estado de paginación
 */
export interface PaginationState {
  currentPage: number
  totalCount: number
  totalPages: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Configuración para el hook de paginación
 */
export interface PaginationConfig {
  tableName: string
  defaultPageSize?: number
  defaultSortBy?: string
  defaultSortOrder?: 'asc' | 'desc'
  select?: string
  filters?: Record<string, any>
}

/**
 * Funciones de navegación de paginación
 */
export interface PaginationActions {
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  goToPage: (page: number) => Promise<void>
  changePageSize: (size: number) => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: Record<string, any>) => Promise<void>
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => Promise<void>
}

/**
 * Resultado completo del hook de paginación
 */
export interface UsePaginationResult<T> extends PaginationState, PaginationActions {
  data: T[]
  fetchData: (params?: PaginationParams) => Promise<PaginatedResult<T>>
}