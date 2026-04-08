/**
 * Definiciones de columnas para el DataTable de proveedores
 * Utiliza TanStack Table para definir la estructura y comportamiento de las columnas
 */

import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, RotateCcw, Phone, Mail, MapPin } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { type Supplier } from '../hooks/useSuppliers'

/**
 * Props para las acciones de las columnas
 */
interface ColumnActionsProps {
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
  onRestore: (supplier: Supplier) => void
}

/**
 * Función para crear las definiciones de columnas del DataTable de proveedores
 * @param actions - Funciones para manejar las acciones de editar y eliminar
 * @returns Array de definiciones de columnas
 */
export const createSuppliersColumns = (
  actions: ColumnActionsProps,
): ColumnDef<Supplier>[] => [
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
  
  // Columna de razón social
  {
    accessorKey: 'business_name',  
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Razón Social
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const businessName = row.getValue('business_name') as string
      return (
        <div className="font-medium">
          {businessName}
        </div>
      )
    },
  },
  
  // Columna de nombre de contacto
  {
    accessorKey: 'contact_name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Contacto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const contactName = row.getValue('contact_name') as string
      return (
        <div className="text-sm">
          {contactName}
        </div>
      )
    },
  },

  // Columna de teléfono
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string
      return (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a 
            href={`tel:${phone}`}
            className="hover:text-primary hover:underline"
          >
            {phone}
          </a>
        </div>
      )
    },
  },

  // Columna de email
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | null
      if (!email) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      return (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a 
            href={`mailto:${email}`}
            className="hover:text-primary hover:underline max-w-[200px] truncate"
            title={email}
          >
            {email}
          </a>
        </div>
      )
    },
  },

  // Columna de dirección
  {
    accessorKey: 'address',
    header: 'Dirección',
    cell: ({ row }) => {
      const address = row.getValue('address') as string | null
      if (!address) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[200px] truncate" title={address}>
            {address}
          </span>
        </div>
      )
    },
  },

  // Columna de estado
  {
    accessorKey: 'deleted_at',
    header: 'Estado',
    cell: ({ row }) => {
      const deletedAt = row.getValue('deleted_at') as string | null
      const isActive = row.original.is_active
      
      if (deletedAt) {
        return <Badge variant="destructive">Eliminado</Badge>
      }
      
      return isActive ? (
        <Badge variant="default">Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
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
      const createdAt = row.getValue('created_at') as string
      const date = new Date(createdAt)
      
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('es-UY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )
    },
  },

  // Columna de última actualización
  {
    accessorKey: 'updated_at',
    header: 'Última Actualización',
    cell: ({ row }) => {
      const updatedAt = row.getValue('updated_at') as string | null
      
      if (!updatedAt) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      
      const date = new Date(updatedAt)
      
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('es-UY', {
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
      const supplier = row.original
      const isDeleted = !!supplier.deleted_at

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
              onClick={() => navigator.clipboard.writeText(supplier.id)}
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isDeleted ? (
              <>
                <DropdownMenuItem onClick={() => actions.onEdit(supplier)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => actions.onDelete(supplier)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => actions.onRestore(supplier)}>
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