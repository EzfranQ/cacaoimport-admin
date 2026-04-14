import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AuthTemplate } from "@/modules/auth";
import { LoginForm } from "@/modules/auth/pages/login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import AdminLayout from "@/shared/layout/adminLayout";
import { ProductsListPage } from "@/modules/products/pages/ProductsList";
import { ProductsFormPage } from "@/modules/products/pages/ProductsForm";
import { CategoriesFormPage } from "@/modules/categories/pages/Form";
import { CategoriesListPage } from "@/modules/categories/pages/List";
import { AttributesListPage } from "@/modules/product-attributes/pages/AttributesList";
import { AttributesFormPage } from "@/modules/product-attributes/pages/AttributesForm";
import { UnitsListPage } from "@/modules/product-attributes/pages/UnitsList";
import { UnitsFormPage } from "@/modules/product-attributes/pages/UnitsForm";
import { OrdersListPage } from "@/modules/orders/pages/OrdersList";
import { SuppliersListPage, SuppliersFormPage } from "@/modules/suppliers";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin" />,
    errorElement: <GlobalErrorBoundary />,
  },
  {
    path: "/auth",
    element: <AuthTemplate />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      {
        index: true,
        path: "login",
        element: <LoginForm />,
      },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute/>,
    errorElement: <GlobalErrorBoundary />,
    children: [
      {
        path: "",
        element: <AdminLayout />,
        children: [
          {
            path: 'categories',
            element: <CategoriesListPage />,
            children: [
              {
                path: "create",
                element: <CategoriesFormPage />,
              },
              {
                path: "edit/:id",
                element: <CategoriesFormPage />,
              },
            ],
          },
          {
            path: "attributes",
            element: <AttributesListPage />,
            children: [
              {
                path: "create",
                element: <AttributesFormPage />,
              },
              {
                path: "edit/:id",
                element: <AttributesFormPage />,
              },
            ],
          },
          {
            path: "units",
            element: <UnitsListPage />,
            children: [
              {
                path: "create",
                element: <UnitsFormPage />,
              },
              {
                path: "edit/:id",
                element: <UnitsFormPage />,
              },
            ],
          },
          {
            path: "suppliers",
            element: <SuppliersListPage />,
            children: [
              {
                path: "create",
                element: <SuppliersFormPage />,
              },
              {
                path: "edit/:id",
                element: <SuppliersFormPage />,
              },
            ],
          },
          {
            path: "products",
            children: [
              {
                index: true,
                element: <ProductsListPage />,
              },
              {
                path: "create",
                element: <ProductsFormPage />,
              },
              {
                path: "edit/:id",
                element: <ProductsFormPage />,
              },
              {
                path: ":id",
              },
            ],
          },
          {
            path: "orders",
            children: [
              {
                index: true,
                element: <OrdersListPage />,
              },
              {
                path: ":id",
                lazy: async () => {
                  const mod = await import("@/modules/orders/pages/OrderDetail");
                  return { Component: mod.OrderDetailPage };
                },
              },
            ],
          },
          {
            path: "billing",
            lazy: async () => {
              const mod = await import("@/modules/billing/pages/BillingPage");
              return { Component: mod.BillingPage };
            },
          },
        ],
      },
    ],
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
