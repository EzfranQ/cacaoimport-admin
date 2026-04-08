import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ExpandedState,
  type OnChangeFn,
  type Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Search } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

/**
 * Configuración de paginación externa
 */
interface PaginationConfig {
  pageIndex: number
  pageSize: number
  totalCount: number
  onPaginationChange: (page: number, pageSize: number) => void
}

/**
 * Configuración de ordenamiento externo
 */
interface SortingConfig {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortingChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

/**
 * Configuración de expansión externa (opcional)
 */
interface ExpandingConfig<TData> {
  getSubRows?: (row: TData) => TData[] | undefined
  getRowCanExpand?: (row: Row<TData>) => boolean
  expanded?: ExpandedState
  onExpandedChange?: OnChangeFn<ExpandedState>
}

/**
 * Propiedades para el componente DataTable
 */
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  error?: string
  searchPlaceholder?: string
  onRowSelectionChange?: (selectedRows: TData[]) => void
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  enableGlobalFilter?: boolean
  emptyMessage?: string
  // Configuración externa
  pagination?: PaginationConfig
  sorting?: SortingConfig
  expanding?: ExpandingConfig<TData>
}

/**
 * Componente DataTable genérico y reutilizable
 * Integra @tanstack/react-table con componentes de shadcn/ui
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error,
  searchPlaceholder = "Buscar...",
  onRowSelectionChange,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableGlobalFilter = true,
  emptyMessage = "No se encontraron resultados.",
  pagination,
  sorting,
  expanding,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  // Determinar si usar paginación/ordenamiento externo o interno
  const isExternalPagination = !!pagination
  const isExternalSorting = !!sorting

  // Configurar el estado de ordenamiento
  const sortingState = React.useMemo(() => {
    if (isExternalSorting && sorting) {
      return [{ id: sorting.sortBy, desc: sorting.sortOrder === 'desc' }]
    }
    return internalSorting
  }, [isExternalSorting, sorting, internalSorting])

  // Configurar la tabla
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Identificador estable para las filas (usa id si existe, índice como fallback)
    getRowId: (originalRow, index) => {
      const maybeId = (originalRow as any)?.id
      return typeof maybeId === 'string' || typeof maybeId === 'number'
        ? String(maybeId)
        : String(index)
    },
    // Solo usar modelos internos si no hay configuración externa
    getPaginationRowModel: isExternalPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: isExternalSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: enableGlobalFilter ? getFilteredRowModel() : undefined,
    getExpandedRowModel: expanding?.getSubRows ? getExpandedRowModel() : undefined,
    getSubRows: expanding?.getSubRows,
    getRowCanExpand: expanding?.getRowCanExpand,
    onSortingChange: isExternalSorting 
      ? (updater) => {
          if (typeof updater === 'function') {
            const newSorting = updater(sortingState)
            if (newSorting.length > 0 && sorting) {
              const sort = newSorting[0]
              sorting.onSortingChange(sort.id, sort.desc ? 'desc' : 'asc')
            }
          }
        }
      : setInternalSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: expanding?.onExpandedChange ?? setExpanded,
    // Configuración de paginación externa
    manualPagination: isExternalPagination,
    manualSorting: isExternalSorting,
    pageCount: isExternalPagination && pagination 
      ? Math.ceil(pagination.totalCount / pagination.pageSize) 
      : undefined,
    state: {
      sorting: sortingState,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded: expanding?.expanded ?? expanded,
      // Configurar paginación externa
      pagination: isExternalPagination && pagination 
        ? {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }
        : undefined,
    },
  })

  // Manejar cambios de paginación externa
  React.useEffect(() => {
    if (isExternalPagination && pagination) {
      table.setPageIndex(pagination.pageIndex)
      table.setPageSize(pagination.pageSize)
    }
  }, [pagination?.pageIndex, pagination?.pageSize, isExternalPagination, table])

  // Notificar cambios en la selección de filas
  React.useEffect(() => {
    if (onRowSelectionChange && enableRowSelection) {
      const selectedRows = table.getSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, enableRowSelection, table])

  return (
    <div className="w-full">
      {/* Barra de herramientas */}
      <div className="flex items-center py-4 gap-4">
        {/* Buscador global */}
        {enableGlobalFilter && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {/* Selector de columnas */}
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Cargando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-destructive"
                >
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Información de selección */}
      {enableRowSelection && (
        <div className="flex-1 text-sm text-muted-foreground py-2">
          {table.getSelectedRowModel().rows.length} de{" "}
          {isExternalPagination && pagination ? pagination.totalCount : table.getRowModel().rows.length} fila(s) seleccionada(s).
        </div>
      )}

      {/* Paginación */}
      {isExternalPagination && pagination ? (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Página {pagination.pageIndex + 1} de{" "}
            {Math.ceil(pagination.totalCount / pagination.pageSize)} ({pagination.totalCount} elementos)
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPaginationChange(pagination.pageIndex - 1, pagination.pageSize)}
              disabled={pagination.pageIndex === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPaginationChange(pagination.pageIndex + 1, pagination.pageSize)}
              disabled={pagination.pageIndex >= Math.ceil(pagination.totalCount / pagination.pageSize) - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}