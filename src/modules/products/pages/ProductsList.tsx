/**
 * Página de listado de Productos
 * Minimal: título, tabla y Outlet para formularios modales.
 */
import { Outlet } from "react-router";
import { Package } from "lucide-react";
import ProductsTable from "../components/ProductsTable";
import { useProducts } from "../hooks/useProducts";

export const ProductsListPage = () => {
  // Total de productos publicados (activos, no eliminados), independiente de los filtros de la tabla.
  const { data } = useProducts({ page: 1, pageSize: 1, includeDeleted: false });
  const total = data?.totalCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Productos</h1>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2">
          <Package className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Productos totales publicados:</span>
          <span className="text-lg font-bold">{total ?? "…"}</span>
        </div>
      </div>
      <ProductsTable />
      <Outlet />
    </div>
  );
};