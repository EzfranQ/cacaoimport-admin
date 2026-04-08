/**
 * Componente de tabla de proveedores que utiliza DataTable con TanStack Query
 * Implementa paginación, filtrado, ordenamiento y acciones CRUD
 */

import React from 'react'
import { useNavigate, Link } from 'react-router'
import { useSuppliers, useDeleteSupplier, useRestoreSupplier, type Supplier, type SuppliersQueryParams } from '../hooks/useSuppliers'
import { DataTable } from '@/shared/components/ui/data-table'
import { createSuppliersColumns } from './columns'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Search, RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'


export const SuppliersTable: React.FC = () => {
  const navigate = useNavigate()
  // Estado para parámetros de consulta
  const [queryParams, setQueryParams] = React.useState<SuppliersQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = React.useState('')

  // Hooks de TanStack Query
  const suppliersQuery = useSuppliers(queryParams)
  const deleteSupplier = useDeleteSupplier()
  const restoreSupplier = useRestoreSupplier()

  // Datos planos de la página actual
  const pageData: Supplier[] = React.useMemo(() => {
    return (suppliersQuery.data?.data || [])
  }, [suppliersQuery.data?.data])

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

  // Manejar edición de proveedor
  const handleEdit = React.useCallback((supplier: Supplier) => {
    navigate(`/admin/suppliers/edit/${supplier.id}`)
  }, [navigate])

  // Manejar eliminación de proveedor
  const handleDelete = React.useCallback(async (supplier: Supplier) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el proveedor "${supplier.business_name}"?`)) {
      try {
        await deleteSupplier.mutateAsync(supplier.id)
        toast.success('Proveedor eliminado exitosamente')
      } catch (error) {
        toast.error('Error al eliminar el proveedor')
      }
    }
  }, [deleteSupplier])

  // Manejar restauración de proveedor
  const handleRestore = React.useCallback(async (supplier: Supplier) => {
    if (window.confirm(`¿Estás seguro de que quieres restaurar el proveedor "${supplier.business_name}"?`)) {
      try {
        await restoreSupplier.mutateAsync(supplier.id)
        toast.success('Proveedor restaurado exitosamente')
      } catch (error) {
        toast.error('Error al restaurar el proveedor')
      }
    }
  }, [restoreSupplier])

  // Manejar actualización manual
  const handleRefresh = React.useCallback(() => {
    suppliersQuery.refetch()
    toast.info('Actualizando proveedores...')
  }, [suppliersQuery])


  const columns = React.useMemo(
    () => createSuppliersColumns({
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
          <span>Gestión de Proveedores</span>
          <Badge variant="secondary">
            {suppliersQuery.data?.totalCount || 0} proveedores
          </Badge>
        </CardTitle>
        
        {/* Barra de búsqueda y acciones */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={suppliersQuery.isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${suppliersQuery.isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          <Button size="sm" asChild>
            <Link
              to="create"
              onClick={() => {
                console.log("[SuppliersTable] link create clicked")
                toast.info("Abriendo formulario de creación...")
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable
          columns={columns}
          data={pageData}
          loading={suppliersQuery.isLoading}
          error={suppliersQuery.error?.message}
          pagination={{
            pageIndex: (queryParams.page || 1) - 1, // DataTable usa índice basado en 0
            pageSize: queryParams.pageSize || 10,
            totalCount: suppliersQuery.data?.totalCount || 0,
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
          emptyMessage="No se encontraron proveedores"
        />
      </CardContent>
    </Card>
  )
}

export default SuppliersTable