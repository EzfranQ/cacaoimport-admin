import { GalleryVerticalEnd, SquareTerminal } from "lucide-react";

export const data = {
  teams: [
    {
      name: "Cacao Import",
      logo: GalleryVerticalEnd,
      plan: "Plataforma administrativa",
    },
  ],
  navMain: [

    {
      title: "Categorías",
      url: "/admin/categories",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Atributos",
      url: "/admin/attributes",
      icon: SquareTerminal,
      isActive: false,
    },
    {
      title: "Unidades",
      url: "/admin/units",
      icon: SquareTerminal,
      isActive: false,
    },
    {
      title: "Productos",
      url: "/admin/products",
      icon: SquareTerminal,
      isActive: false,
    },
    {
      title: "Proveedores",
      url: "/admin/suppliers",
      icon: SquareTerminal,
      isActive: false,
    }
    ,
    {
      title: "Órdenes",
      url: "/admin/orders",
      icon: SquareTerminal,
      isActive: false,
    }
  ],
}