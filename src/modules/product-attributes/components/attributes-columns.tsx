/**
 * Columnas de la tabla de Atributos
 */
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { type Attribute } from "../hooks/useAttributes";

export const createAttributesColumns = (handlers: {
  onEdit: (attribute: Attribute) => void;
  onDelete: (attribute: Attribute) => void;
  onRestore: (attribute: Attribute) => void;
}): ColumnDef<Attribute>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Nombre
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => row.getValue("description") || "-",
  },
  {
    accessorKey: "created_at",
    header: "Creada",
    cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
  },
  {
    accessorKey: "deleted_at",
    header: "Estado",
    cell: ({ row }) => (
      row.getValue("deleted_at") ? (
        <Badge variant="destructive">Eliminado</Badge>
      ) : (
        <Badge variant="secondary">Activo</Badge>
      )
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const attribute = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlers.onEdit(attribute)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            {attribute.deleted_at ? (
              <DropdownMenuItem onClick={() => handlers.onRestore(attribute)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handlers.onDelete(attribute)}>
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];