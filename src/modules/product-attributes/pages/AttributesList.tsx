/**
 * Página de listado de Atributos de Producto
 * Minimal: título, tabla y Outlet para formularios modales.
 */
import { Outlet } from "react-router";
import AttributesTable from "../components/AttributesTable";

export const AttributesListPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Atributos de producto</h1>
      <AttributesTable />
      <Outlet />
    </div>
  );
}