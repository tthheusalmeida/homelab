import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Search } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "#ui/sidebar";

import { AppSidebar } from "../../components/AppSidebar";
import { ClockAndTime } from "#components/ClockAndTime";
import { CommandPalette } from "#components/CommandPalette";
import { InstallAssistant } from "#components/InstallAssistant";
import { NoticeCenter } from "#components/NoticeCenter";
import { PageHeaderSlotContext } from "#components/PageHeaderSlot";
import { useAppShortcuts } from "#hooks/use-app-shortcuts";
import { useIpcEvent } from "#hooks/use-ipc-event";
import { ipc } from "#lib/ipc";
import { settingsUrl } from "#lib/settings-route";
import { IpcChannels } from "#shared/channels";
import { IpcEvents } from "#shared/events";
import { ScrollArea } from "#ui/scroll-area";

/** Telas que ocupam a área útil inteira e cuidam da própria rolagem (a conversa, como no ChatGPT). */
const FILL_ROUTES = ["/ai/chat", "/settings"];

export function AppLayout() {
  const { pathname } = useLocation();
  const fill = FILL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Onde o `PageHeader` da tela se desenha: fora da área que rola, então o cabeçalho é fixo.
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useAppShortcuts(openPalette);

  const navigate = useNavigate();

  // O main pede as Configurações (Ctrl+, ou atalho de outra tela) e, na primeira execução, deixa a
  // seção guardada até a tela abrir.
  useIpcEvent(IpcEvents.settingsNavigate, ({ section }) => void navigate(settingsUrl(section)));

  useEffect(() => {
    ipc
      .invoke(IpcChannels.app.settingsSection)
      .then((section) => {
        if (section) {
          void navigate(settingsUrl(section));
        }
      })
      .catch(() => undefined);
    // só na abertura do app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />

      <PageHeaderSlotContext.Provider value={headerSlot}>
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

        <div ref={setHeaderSlot} data-slot="page-header-slot" className="shrink-0" />

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
      </PageHeaderSlotContext.Provider>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <InstallAssistant />

      <NoticeCenter />
    </SidebarProvider>
  );
}
