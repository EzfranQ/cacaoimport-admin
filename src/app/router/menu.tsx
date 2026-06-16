import { Store, Tags, SlidersHorizontal, Scale, Package, Truck, ShoppingCart, Receipt, Users, Contact, LayoutTemplate, Printer } from "lucide-react";

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
      title: "Tickets de Envío",
      url: "/admin/shipping-tickets",
      icon: Printer,
      isActive: false,
    },
    {
      title: "Clientes",
      url: "/admin/clients",
      icon: Contact,
      isActive: false,
    },
    {
      title: "Usuarios",
      url: "/admin/users",
      icon: Users,
      isActive: false,
    },
    {
      title: "Contenido del sitio",
      url: "/admin/site",
      icon: LayoutTemplate,
      isActive: false,
      items: [
        { title: "Carrusel principal", url: "/admin/site/hero" },
        { title: "Productos destacados", url: "/admin/site/featured" },
        { title: "Nuevos Ingresos", url: "/admin/site/new-arrivals" },
        { title: "Banners", url: "/admin/site/banners" },
        { title: "Categorías del Home", url: "/admin/site/categories" },
        { title: "Logo", url: "/admin/site/logo" },
        { title: "Dirección y horarios", url: "/admin/site/contact" },
        { title: "Ofertas Destacadas", url: "/admin/site/offers" },
        { title: "Textos del Banner", url: "/admin/site/trust-items" },
      ],
    }
  ],
}