import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Search } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "#ui/sidebar";

import { AppSidebar } from "../../components/AppSidebar";
import { ClockAndTime } from "#components/ClockAndTime";
import { CommandPalette } from "#components/CommandPalette";
import { InstallAssistant } from "#components/InstallAssistant";
import { NoticeCenter } from "#components/NoticeCenter";
import { useAppShortcuts } from "#hooks/use-app-shortcuts";
import { ScrollArea } from "#ui/scroll-area";

/** Telas que ocupam a área útil inteira e cuidam da própria rolagem (a conversa, como no ChatGPT). */
const FILL_ROUTES = ["/ai/chat"];

export function AppLayout() {
  const { pathname } = useLocation();
  const fill = FILL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useAppShortcuts(openPalette);

  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="flex h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
          <SidebarTrigger />

          <button
            type="button"
            onClick={openPalette}
            className="ml-2 flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" />
            Buscar
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Ctrl K</kbd>
          </button>
          <ClockAndTime />
        </header>

        {fill ? (
          <div
            key={pathname}
            className="flex min-h-0 min-w-0 flex-1 animate-enter-fade flex-col overflow-hidden p-4"
          >
            <Outlet />
          </div>
        ) : (
        <ScrollArea className="min-h-0 flex-1">
          {/* A chave troca o bloco a cada rota, e a página nova entra só com um fade (sem subir). */}
          <div
            key={pathname}
            className="flex min-w-0 flex-1 animate-enter-fade flex-col p-4"
          >
            <Outlet />
          </div>
        </ScrollArea>
        )}
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <InstallAssistant />

      <NoticeCenter />
    </SidebarProvider>
  );
}
