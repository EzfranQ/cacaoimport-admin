import { Store, Tags, SlidersHorizontal, Scale, Package, Truck, ShoppingCart, Receipt, Users } from "lucide-react";

export const data = {
  teams: [
    {
      name: "Cacao Import",
      logo: Store,
      plan: "Plataforma administrativa",
    },
  ],
  navMain: [
    {
      title: "Categorías",
      url: "/admin/categories",
      icon: Tags,
      isActive: true,
    },
    {
      title: "Atributos",
      url: "/admin/attributes",
      icon: SlidersHorizontal,
      isActive: false,
    },
    {
      title: "Unidades",
      url: "/admin/units",
      icon: Scale,
      isActive: false,
    },
    {
      title: "Productos",
      url: "/admin/products",
      icon: Package,
      isActive: false,
    },
    {
      title: "Proveedores",
      url: "/admin/suppliers",
      icon: Truck,
      isActive: false,
    },
    {
      title: "Órdenes",
      url: "/admin/orders",
      icon: ShoppingCart,
      isActive: false,
    },
    {
      title: "Facturación",
      url: "/admin/billing",
      icon: Receipt,
      isActive: false,
    },
    {
      title: "Usuarios",
      url: "/admin/users",
      icon: Users,
      isActive: false,
    }
  ],
}