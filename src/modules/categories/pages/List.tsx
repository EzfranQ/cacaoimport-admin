import { Outlet } from "react-router";
import CategoriesTable from "../components/CategoriesTable";

export const CategoriesListPage = () => {
  
  return (
    <div className="space-y-4">
        <h1 className="text-3xl font-bold">
            Categorías
        </h1>
        <CategoriesTable />
        <Outlet />
    </div>
  );
}