import { AppSidebar } from "@/shared/layout/adminLayout/components/app-sidebar"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar"
import { Outlet } from "react-router"

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="glassmorphism sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 shadow-sm px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
          <Outlet></Outlet>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
