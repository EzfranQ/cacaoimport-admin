/**
 * Tabla mínima para Unidades de Medida
 */
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, RotateCcw, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useUnits, useDeleteUnitWithValidation, useRestoreUnit, type Unit } from "../hooks/useUnits";
import { toast } from "sonner";
import { DataTable } from "@/shared/components/ui/data-table";

export default function UnitsTable() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");

  const { data, isLoading } = useUnits({
    page: 1,
    pageSize: 20,
    search,
    includeDeleted: true,
  });

  const onCreate = () => navigate(`/admin/units/create`, { state: { backgroundLocation: location } });
  // Ruta correcta según router: /admin/units/edit/:id
  const onEdit = (unit: Unit) => navigate(`/admin/units/edit/${unit.id}`, { state: { backgroundLocation: location } });

  const deleteWithValidationMutation = useDeleteUnitWithValidation();
  const restoreMutation = useRestoreUnit();

  /**
   * Elimina una unidad (soft delete) con validación de uso y confirmación del usuario.
   * Previene borrados accidentales y eliminar unidades que están en uso.
   */
  const onDelete = async (unit: Unit) => {
    const confirmed = window.confirm(`¿Estás seguro de eliminar la unidad "${unit.name}"?`);
    if (!confirmed) return;
    
    try {
      await deleteWithValidationMutation.mutateAsync(unit);
      toast.success(`Unidad "${unit.name}" eliminada correctamente`);
    } catch (error: any) {
      // Mostrar el mensaje de error detallado en un toast
      const errorMessage = error.message || 'Error al eliminar la unidad';
      toast.error(errorMessage, {
        duration: 8000, // Mostrar por más tiempo para que el usuario pueda leer el mensaje completo
        style: {
          whiteSpace: 'pre-line', // Permitir saltos de línea en el mensaje
        },
      });
    }
  };

  const onRestore = async (unit: Unit) => {
    await restoreMutation.mutateAsync(unit.id);
  };

  const columns: ColumnDef<Unit>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc") }>
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    { accessorKey: "code", header: "Código" },
    { accessorKey: "symbol", header: "Símbolo", cell: ({ row }) => row.getValue("symbol") || "-" },
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
        const unit = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(unit)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              {unit.deleted_at ? (
                <DropdownMenuItem onClick={() => onRestore(unit)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onDelete(unit)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva unidad
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        pagination={{
          pageIndex: 0,
          pageSize: 20,
          totalCount: data?.totalCount || 0,
          onPaginationChange: () => {},
        }}
      />
    </div>
  );
}
