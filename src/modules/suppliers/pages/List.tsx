import { Outlet } from "react-router";
import SuppliersTable from "../components/SuppliersTable";

export const SuppliersListPage = () => {
  
  return (
    <div className="space-y-4">
        <h1 className="text-3xl font-bold">
            Proveedores
        </h1>
        <SuppliersTable />
        <Outlet />
    </div>
  );
}