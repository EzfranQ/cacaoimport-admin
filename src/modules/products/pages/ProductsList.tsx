/**
 * Página de listado de Productos
 * Minimal: título, tabla y Outlet para formularios modales.
 */
import { Outlet } from "react-router";
import ProductsTable from "../components/ProductsTable";

export const ProductsListPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Productos</h1>
      <ProductsTable />
      <Outlet />
    </div>
  );
};