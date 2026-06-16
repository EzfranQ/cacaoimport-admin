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
import { UsersListPage } from "@/modules/users/pages/UsersList";
import { HeroSlidesPage } from "@/modules/site-content/pages/HeroSlidesPage";
import { FeaturedProductsPage } from "@/modules/site-content/pages/FeaturedProductsPage";
import { NewArrivalsPage } from "@/modules/site-content/pages/NewArrivalsPage";
import { BannersPage } from "@/modules/site-content/pages/BannersPage";
import { CategoryCardsPage } from "@/modules/site-content/pages/CategoryCardsPage";
import { LogoPage } from "@/modules/site-content/pages/LogoPage";
import { ContactInfoPage } from "@/modules/site-content/pages/ContactInfoPage";
import { OffersHighlightsPage } from "@/modules/site-content/pages/OffersHighlightsPage";
import { TrustItemsPage } from "@/modules/site-content/pages/TrustItemsPage";
import { ShippingTicketsPage } from "@/modules/shipping-tickets/pages/ShippingTicketsPage";

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
            index: true,
            element: <Navigate to="/admin/orders" replace />
          },
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
            path: "users",
            element: <UsersListPage />,
          },
          {
            path: "shipping-tickets",
            element: <ShippingTicketsPage />,
          },
          {
            path: "site",
            children: [
              { index: true, element: <Navigate to="/admin/site/hero" replace /> },
              { path: "hero", element: <HeroSlidesPage /> },
              { path: "featured", element: <FeaturedProductsPage /> },
              { path: "new-arrivals", element: <NewArrivalsPage /> },
              { path: "banners", element: <BannersPage /> },
              { path: "categories", element: <CategoryCardsPage /> },
              { path: "logo", element: <LogoPage /> },
              { path: "contact", element: <ContactInfoPage /> },
              { path: "offers", element: <OffersHighlightsPage /> },
              { path: "trust-items", element: <TrustItemsPage /> },
            ],
          },
          {
            path: "billing",
            lazy: async () => {
              const mod = await import("@/modules/billing/pages/BillingPage");
              return { Component: mod.BillingPage };
            },
          },
          {
            path: "clients",
            children: [
              {
                index: true,
                lazy: async () => {
                  const mod = await import("@/modules/clients/pages/ClientsList");
                  return { Component: mod.ClientsList };
                },
              },
              {
                path: ":clientKey",
                lazy: async () => {
                  const mod = await import("@/modules/clients/pages/ClientDetail");
                  return { Component: mod.ClientDetail };
                },
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
