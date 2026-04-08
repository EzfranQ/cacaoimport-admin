/**
 * Tabla de atributos reutilizando el patrón de CategoriesTable
 * Minimal: búsqueda, paginación, columnas básicas y acciones CRUD.
 */
import React from "react";
import { useNavigate, Link } from "react-router";
import {
  useAttributes,
  useDeleteAttributeWithValidation,
  useRestoreAttribute,
  type Attribute,
  type AttributesQueryParams,
} from "../hooks/useAttributes";
import { DataTable } from "@/shared/components/ui/data-table";
import { createAttributesColumns } from "./attributes-columns";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Search, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

const AttributesTable: React.FC = () => {
  const navigate = useNavigate();

  const [queryParams, setQueryParams] = React.useState<AttributesQueryParams>({
    page: 1,
    pageSize: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  const [searchTerm, setSearchTerm] = React.useState("");

  const attributesQuery = useAttributes(queryParams);
  const deleteAttribute = useDeleteAttributeWithValidation();
  const restoreAttribute = useRestoreAttribute();

  const pageData: Attribute[] = React.useMemo(() => {
    return attributesQuery.data?.data || [];
  }, [attributesQuery.data?.data]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQueryParams((prev) => ({
        ...prev,
        search: searchTerm.trim() || undefined,
        page: 1,
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePaginationChange = React.useCallback(
    (pageIndex: number, pageSize: number) => {
      const page = pageIndex + 1;
      setQueryParams((prev) => ({
        ...prev,
        page,
        pageSize,
      }));
    },
    []
  );

  const handleSortingChange = React.useCallback((sortBy: string, sortOrder: "asc" | "desc") => {
    setQueryParams((prev) => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  }, []);

  const handleEdit = React.useCallback((attribute: Attribute) => {
    navigate(`edit/${attribute.id}`);
  }, [navigate]);

  const handleDelete = React.useCallback(async (attribute: Attribute) => {
    if (!window.confirm(`¿Estás seguro de eliminar el atributo "${attribute.name}"?`)) {
      return;
    }
    try {
      await deleteAttribute.mutateAsync(attribute.id);
      toast.success("Atributo eliminado correctamente");
    } catch (error: any) {
      const errorMessage = error.message || "Error al eliminar el atributo";
      toast.error(errorMessage, {
        style: {
          whiteSpace: "pre-line",
          maxWidth: "500px",
          fontSize: "14px",
        },
        duration: 8000,
      });
    }
  }, [deleteAttribute]);

  const handleRestore = React.useCallback(async (attribute: Attribute) => {
    try {
      await restoreAttribute.mutateAsync(attribute.id);
      toast.success("Atributo restaurado");
    } catch (error: any) {
      toast.error(error.message || "Error al restaurar");
    }
  }, [restoreAttribute]);

  const handleRefresh = React.useCallback(() => {
    attributesQuery.refetch();
  }, [attributesQuery]);

  const columns = React.useMemo(
    () =>
      createAttributesColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleEdit, handleDelete, handleRestore]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestión de Atributos</span>
          <Badge variant="secondary">
            {attributesQuery.data?.totalCount || 0} atributos
          </Badge>
        </CardTitle>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atributos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={attributesQuery.isLoading}>
              <RefreshCw className={`h-4 w-4 ${attributesQuery.isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          <Button size="sm" asChild>
            <Link to="create" onClick={() => toast.info("Abriendo formulario de creación...") }>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Atributo
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable
          columns={columns}
          data={pageData}
          loading={attributesQuery.isLoading}
          error={attributesQuery.error?.message}
          pagination={{
            pageIndex: (queryParams.page || 1) - 1,
            pageSize: queryParams.pageSize || 10,
            totalCount: attributesQuery.data?.totalCount || 0,
            onPaginationChange: handlePaginationChange,
          }}
          sorting={{
            sortBy: queryParams.sortBy || "created_at",
            sortOrder: queryParams.sortOrder || "desc",
            onSortingChange: handleSortingChange,
          }}
          enableRowSelection={false}
          enableColumnVisibility={true}
          enableGlobalFilter={false}
          emptyMessage="No se encontraron atributos"
        />
      </CardContent>
    </Card>
  );
};

export default AttributesTable;