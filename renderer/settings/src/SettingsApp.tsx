import { useState, type CSSProperties } from 'react';
import { Cloud, Cpu, Folder, Palette, type LucideIcon } from 'lucide-react';

import { Logo } from '#components/Hex';
import { ScrollArea } from '#ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '#ui/sidebar';

import { RestartBanner } from './components/RestartBanner';
import { SnackbarProvider } from '#components/Snackbar';
import { relaunchApp } from './hooks';
import { AppearanceSection } from './sections/AppearanceSection';
import { ExternalProvidersSection } from './sections/ExternalProvidersSection';
import { LocalProvidersSection } from './sections/LocalProvidersSection';
import { PathsSection } from './sections/PathsSection';
import { SECTIONS, Strings, type SectionId } from './strings';

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  paths: Folder,
  appearance: Palette,
  external: Cloud,
  local: Cpu,
};

/**
 * Janela de Configurações. Usa os mesmos componentes e as mesmas transições do app: o menu é o
 * `Sidebar` da UI (item ativo colorido com transição) e cada seção entra com fade.
 */
export function SettingsApp() {
  const [sectionId, setSectionId] = useState<SectionId>('paths');
  const [restartPending, setRestartPending] = useState(false);

  const handleSaved = (restartRequired: boolean) => {
    if (restartRequired) {
      setRestartPending(true);
    }
  };

  const section = SECTIONS.find(({ id }) => id === sectionId) ?? SECTIONS[0];

  return (
    <SnackbarProvider raised={restartPending}>
      <SidebarProvider
        className="h-svh min-h-0 bg-background text-foreground"
        style={{ '--sidebar-width': '15rem' } as CSSProperties}
      >
        <Sidebar collapsible="none" aria-label="Seções de configuração" className="border-r">
          <SidebarHeader>
            <div className="flex flex-col gap-1 px-2 pt-1 pb-2 select-none">
              <div className="flex items-center gap-2.5">
                <Logo />
                <h1 className="text-lg font-semibold tracking-tight">{Strings.title}</h1>
              </div>
              <p className="text-xs text-muted-foreground">{Strings.subtitle}</p>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {SECTIONS.map(({ id, label }) => {
                    const Icon = SECTION_ICONS[id];

                    return (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          isActive={id === sectionId}
                          aria-current={id === sectionId ? 'page' : undefined}
                          onClick={() => setSectionId(id)}
                          className="text-[13px] select-none [&_svg]:size-[15px]"
                        >
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            {/* A chave troca o bloco a cada seção, que entra com fade (como as páginas do app). */}
            <main
              key={sectionId}
              className="mx-auto flex max-w-2xl animate-enter-fade flex-col gap-6 p-8"
            >
              <header>
                <h2 className="text-xl font-semibold tracking-tight">{section.label}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </header>

              {sectionId === 'paths' && <PathsSection onSaved={handleSaved} />}
              {sectionId === 'appearance' && <AppearanceSection />}
              {sectionId === 'external' && <ExternalProvidersSection onSaved={handleSaved} />}
              {sectionId === 'local' && <LocalProvidersSection onSaved={handleSaved} />}
            </main>
          </ScrollArea>

          {restartPending && <RestartBanner onRestart={() => void relaunchApp()} />}
        </div>
      </SidebarProvider>
    </SnackbarProvider>
  );
}
