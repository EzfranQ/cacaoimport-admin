/**
 * Componente de paginación reutilizable
 * Funciona con cualquier hook que implemente la interfaz de paginación
 */

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showPageInfo?: boolean
  showFirstLastButtons?: boolean
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  showFirstLastButtons = true,
  className = ''
}) => {
  // Calcular el rango de elementos mostrados
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const delta = 2 // Número de páginas a mostrar a cada lado de la página actual
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      if (totalPages > 1) {
        rangeWithDots.push(totalPages)
      }
    }

    return rangeWithDots
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={`flex items-center justify-between space-x-6 lg:space-x-8 ${className}`}>
      {/* Información de elementos */}
      {showPageInfo && (
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Mostrando {startItem} a {endItem} de {totalCount} resultados
          </p>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {/* Selector de tamaño de página */}
        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controles de navegación */}
        <div className="flex items-center space-x-2">
          {/* Botón primera página */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!hasPreviousPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">Primera página</span>
            </Button>
          )}

          {/* Botón página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Página anterior</span>
          </Button>

          {/* Números de página */}
          <div className="flex items-center space-x-1">
            {pageNumbers.map((pageNumber, index) => (
              <React.Fragment key={index}>
                {pageNumber === '...' ? (
                  <span className="px-2 py-1 text-sm">...</span>
                ) : (
                  <Button
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber as number)}
                    disabled={isLoading}
                    className="h-8 w-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Botón página siguiente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Página siguiente</span>
          </Button>

          {/* Botón última página */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
              <span className="sr-only">Última página</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook helper para usar con el componente Pagination
 * Simplifica la integración con hooks de paginación
 */
export const usePaginationProps = (paginationHook: any) => {
  return {
    currentPage: paginationHook.currentPage,
    totalPages: paginationHook.totalPages,
    totalCount: paginationHook.totalCount,
    pageSize: paginationHook.pageSize,
    hasNextPage: paginationHook.hasNextPage,
    hasPreviousPage: paginationHook.hasPreviousPage,
    isLoading: paginationHook.isLoading,
    onPageChange: paginationHook.goToPage,
    onPageSizeChange: paginationHook.changePageSize,
  }
}