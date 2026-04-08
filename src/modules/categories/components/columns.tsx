/**
 * Definiciones de columnas para el DataTable de categorías
 * Utiliza TanStack Table para definir la estructura y comportamiento de las columnas
 */

import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, RotateCcw, ChevronRight, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { type Category } from '../hooks/useCategories'

/**
 * Props para las acciones de las columnas
 */
interface ColumnActionsProps {
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onRestore: (category: Category) => void
}

/**
 * Función para crear las definiciones de columnas del DataTable de categorías
 * @param actions - Funciones para manejar las acciones de editar y eliminar
 * @returns Array de definiciones de columnas
 */
export const createCategoriesColumns = (
  actions: ColumnActionsProps,
): ColumnDef<Category>[] => [
  // Columna de selección
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todas"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  
  // Columna de nombre
  {
    accessorKey: 'name',  
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    /**
     * Render de la celda "Nombre" con soporte para jerarquía:
     * - Indenta según el nivel de profundidad (row.depth)
     * - Muestra botón de expandir/contraer si la fila tiene subfilas (row.getCanExpand())
     * Nota: El botón solo aparecerá cuando el DataTable reciba getSubRows en su configuración.
     */
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const canExpand = row.getCanExpand()
      const isExpanded = row.getIsExpanded()

      return (
        <div className="flex items-center">
          <div style={{ paddingLeft: `${row.depth * 16}px` }} className="flex items-center gap-2">
            {canExpand ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={row.getToggleExpandedHandler()}
                aria-label={isExpanded ? 'Contraer' : 'Expandir'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : null}
            <span className="font-medium">{name}</span>
          </div>
        </div>
      )
    },
  },
  
  // Columna de descripción
  {
    accessorKey: 'description',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Descripción
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const description = row.getValue('description') as string
      return (
        <div className="text-muted-foreground max-w-[300px] truncate">
          {description || 'Sin descripción'}
        </div>
      )
    },
  },
  
  // Columna de categoría padre (si existe)
  {
    accessorKey: 'parent_id',
    header: 'Categoría Padre',
    cell: ({ row }) => {
      const parentId = row.getValue('parent_id') as string | null
      if (parentId) {
        // Preferir el nombre embebido del padre si existe
        const embeddedParentName = (row.original as any)?.parent?.name as string | undefined
        const parentName = embeddedParentName ?? undefined
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">Subcategoría</Badge>
            <span className="text-muted-foreground">{parentName || '—'}</span>
          </div>
        )
      }
      return <Badge variant="secondary">Principal</Badge>
    },
  },
  
  // Columna de estado
  {
    accessorKey: 'deleted_at',
    header: 'Estado',
    cell: ({ row }) => {
      const deletedAt = row.getValue('deleted_at') as string | null
      return deletedAt ? (
        <Badge variant="destructive">Eliminada</Badge>
      ) : (
        <Badge variant="default">Activa</Badge>
      )
    },
  },
  
  // Columna de fecha de creación
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Fecha de Creación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return (
        <div className="text-sm">
          {date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )
    },
  },
  
  // Columna de fecha de actualización (si existe)
  {
    accessorKey: 'updated_at',
    header: 'Última Actualización',
    cell: ({ row }) => {
      const updatedAt = row.getValue('updated_at') as string
      if (!updatedAt) return <div className="text-muted-foreground">-</div>
      
      const date = new Date(updatedAt)
      return (
        <div className="text-sm">
          {date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )
    },
  },
  
  // Columna de acciones
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const category = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(category.id)}
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!category.deleted_at ? (
              <>
                <DropdownMenuItem
                  onClick={() => actions.onEdit(category)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => actions.onDelete(category)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => actions.onRestore(category)}
                className="cursor-pointer text-green-600 focus:text-green-600"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]