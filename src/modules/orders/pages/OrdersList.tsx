/**
 * Página de listado de Órdenes
 * Minimal: título, tabla y Outlet para formularios/modales.
 */
import { Outlet } from "react-router";
import OrdersTable from "../components/OrdersTable";

export const OrdersListPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Órdenes</h1>
      <OrdersTable />
      <Outlet />
    </div>
  );
};