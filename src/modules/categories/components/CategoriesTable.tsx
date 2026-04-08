/**
 * Componente de tabla de categorías que utiliza DataTable con TanStack Query
 * Implementa paginación, filtrado, ordenamiento y acciones CRUD
 */

import React from 'react'
import { useNavigate, Link } from 'react-router'
import { useCategories, useDeleteCategoryWithValidation, useRestoreCategory, type Category, type CategoriesQueryParams } from '../hooks/useCategories'
import { DataTable } from '@/shared/components/ui/data-table'
import { createCategoriesColumns } from './columns'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Search, RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'


export const CategoriesTable: React.FC = () => {
  const navigate = useNavigate()
  // Estado para parámetros de consulta
  const [queryParams, setQueryParams] = React.useState<CategoriesQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = React.useState('')

  // Hooks de TanStack Query
  const categoriesQuery = useCategories(queryParams)
  const deleteCategory = useDeleteCategoryWithValidation()
  const restoreCategory = useRestoreCategory()

  // Datos planos de la página actual
  const pageData: Category[] = React.useMemo(() => {
    return (categoriesQuery.data?.data || [])
  }, [categoriesQuery.data?.data])

  // Manejar búsqueda con debounce
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQueryParams(prev => ({
        ...prev,
        search: searchTerm.trim() || undefined,
        page: 1, // Reset a la primera página al buscar
      }))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Manejar cambios de paginación
  const handlePaginationChange = React.useCallback((pageIndex: number, pageSize: number) => {
    // Convertir pageIndex (basado en 0) a page (basado en 1)
    const page = pageIndex + 1
    setQueryParams(prev => ({
      ...prev,
      page,
      pageSize,
    }))
  }, [])

  // Manejar cambios de ordenamiento
  const handleSortingChange = React.useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setQueryParams(prev => ({
      ...prev,
      sortBy,
      sortOrder,
    }))
  }, [])

  // Eliminado handleCreate, usamos Link asChild para navegación relativa

  // Manejar edición de categoría
  const handleEdit = React.useCallback((category: Category) => {
    navigate(`/admin/categories/edit/${category.id}`)
  }, [navigate])

  // Manejar eliminación de categoría
  const handleDelete = React.useCallback(async (category: Category) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      try {
        await deleteCategory.mutateAsync(category.id)
        toast.success('Categoría eliminada exitosamente')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la categoría'
        toast.error(errorMessage, {
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '500px',
            fontSize: '14px'
          },
          duration: 8000
        })
      }
    }
  }, [deleteCategory])

  // Manejar restauración de categoría
  const handleRestore = React.useCallback(async (category: Category) => {
    if (window.confirm(`¿Estás seguro de que quieres restaurar la categoría "${category.name}"?`)) {
      try {
        await restoreCategory.mutateAsync(category.id)
        toast.success('Categoría restaurada exitosamente')
      } catch (error) {
        toast.error('Error al restaurar la categoría')
      }
    }
  }, [restoreCategory])

  // Manejar actualización manual
  const handleRefresh = React.useCallback(() => {
    categoriesQuery.refetch()
    toast.info('Actualizando categorías...')
  }, [categoriesQuery])


  const columns = React.useMemo(
    () => createCategoriesColumns({
      onEdit: handleEdit,
      onDelete: handleDelete,
      onRestore: handleRestore,
    }),
    [handleEdit, handleDelete, handleRestore]
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestión de Categorías</span>
          <Badge variant="secondary">
            {categoriesQuery.data?.totalCount || 0} categorías
          </Badge>
        </CardTitle>
        
        {/* Barra de búsqueda y acciones */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={categoriesQuery.isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${categoriesQuery.isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          <Button size="sm" asChild>
            <Link
              to="create"
              onClick={() => {
                console.log("[CategoriesTable] link create clicked")
                toast.info("Abriendo formulario de creación...")
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable
          columns={columns}
          data={pageData}
          loading={categoriesQuery.isLoading}
          error={categoriesQuery.error?.message}
          pagination={{
            pageIndex: (queryParams.page || 1) - 1, // DataTable usa índice basado en 0
            pageSize: queryParams.pageSize || 10,
            totalCount: categoriesQuery.data?.totalCount || 0,
            onPaginationChange: handlePaginationChange,
          }}
          sorting={{
            sortBy: queryParams.sortBy || 'created_at',
            sortOrder: queryParams.sortOrder || 'desc',
            onSortingChange: handleSortingChange,
          }}
          enableRowSelection={false}
          enableColumnVisibility={true}
          enableGlobalFilter={false} // Deshabilitamos el filtro global ya que tenemos búsqueda personalizada
          emptyMessage="No se encontraron categorías"
        />
      </CardContent>
    </Card>
  )
}

export default CategoriesTable