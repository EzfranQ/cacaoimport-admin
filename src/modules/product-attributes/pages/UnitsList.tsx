/**
 * Página de listado de Unidades de Medida
 */
import { Outlet } from "react-router";
import UnitsTable from "../components/UnitsTable";

export const UnitsListPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Unidades de medida</h1>
      <UnitsTable />
      <Outlet />
    </div>
  );
}