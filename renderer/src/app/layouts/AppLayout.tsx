import { Outlet, useLocation } from "react-router";

import { SidebarProvider, SidebarTrigger } from "#ui/sidebar";

import { AppSidebar } from "../../components/AppSidebar";
import { ClockAndTime } from "#components/ClockAndTime";
import { ScrollArea } from "#ui/scroll-area";

export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="flex h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
          <SidebarTrigger />
          <ClockAndTime />
        </header>

        <ScrollArea className="min-h-0 flex-1">
          {/* A chave troca o bloco a cada rota, e a página nova entra com um fade curto. */}
          <div
            key={pathname}
            className="flex min-w-0 flex-1 animate-enter flex-col p-4"
          >
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </SidebarProvider>
  );
}
