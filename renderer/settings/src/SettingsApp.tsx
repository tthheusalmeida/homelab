import { useState, type CSSProperties } from 'react';
import {
  Archive,
  Bot,
  Cloud,
  Cpu,
  Download,
  Folder,
  KeyRound,
  LayoutPanelTop,
  MessageSquareText,
  Palette,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

import { PageHeader } from '#components/PageHeader';
import { ScrollArea } from '#ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#ui/sidebar';

import { RestartBanner } from './components/RestartBanner';
import { SidebarSection } from '#components/SidebarSection';
import { SnackbarProvider } from '#components/Snackbar';
import { useCollapsedGroups } from '#hooks/use-collapsed-groups';
import { useMarkRestartPending, useRestartPending } from '#hooks/use-restart-pending';
import { relaunchApp } from '#lib/restart';
import { cn } from '#lib/utils';
import { AppearanceSection } from './sections/AppearanceSection';
import { BackupSection } from './sections/BackupSection';
import { UpdatesSection } from './sections/UpdatesSection';
import { AccessSection } from './sections/AccessSection';
import { ComponentsSection } from './sections/ComponentsSection';
import { DefaultAiSection } from './sections/DefaultAiSection';
import { ExternalProvidersSection } from './sections/ExternalProvidersSection';
import { InfographicGallerySection } from './sections/InfographicGallerySection';
import { LocalProvidersSection } from './sections/LocalProvidersSection';
import { PathsSection } from './sections/PathsSection';
import { PromptsSection } from './sections/PromptsSection';
import {
  SECTION_GROUPS,
  SECTIONS,
  SETTINGS_COLLAPSED_KEY,
  Strings,
  type SectionId,
} from './strings';

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  paths: Folder,
  appearance: Palette,
  infographic: LayoutPanelTop,
  ai: Bot,
  external: Cloud,
  local: Cpu,
  prompts: MessageSquareText,
  components: Download,
  access: KeyRound,
  backup: Archive,
  updates: RefreshCw,
};

const isSectionId = (value: string | null | undefined): value is SectionId =>
  SECTIONS.some(({ id }) => id === value);

/**
 * Tela de Configurações (rota `/settings` do app). Usa os mesmos componentes e as mesmas transições
 * do app: o menu é o `Sidebar` da UI (item ativo colorido com transição) e cada seção entra com fade.
 * `initialSection` vem do endereço (`?section=`); seção desconhecida cai em Aparência.
 */
export function SettingsApp({ initialSection }: { initialSection?: string | null }) {
  const [sectionId, setSectionId] = useState<SectionId>(
    isSectionId(initialSection) ? initialSection : 'appearance',
  );
  // O estado vive no main: sobrevive a fechar as Configurações e aparece na barra lateral do app.
  const restartPending = useRestartPending();
  const markRestartPending = useMarkRestartPending();
  const [collapsed, toggleGroup] = useCollapsedGroups(SETTINGS_COLLAPSED_KEY);

  const handleSaved = (restartRequired: boolean) => {
    if (restartRequired) {
      markRestartPending();
    }
  };

  const section = SECTIONS.find(({ id }) => id === sectionId) ?? SECTIONS[0];

  return (
    <SnackbarProvider raised={restartPending}>
      {/* Mesmo cabeçalho das outras telas (prompt, título e descrição); o comando acompanha a seção. */}
      <div className="flex h-full min-h-0 flex-col gap-4">
        <PageHeader
          title={Strings.title}
          command={`settings --${section.id}`}
          description={Strings.subtitle}
        />

      <div
        className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background text-foreground"
        style={{ '--sidebar-width': '15rem' } as CSSProperties}
      >
        <Sidebar collapsible="none" aria-label="Seções de configuração" className="border-r">
          <SidebarContent>
            {/* Mesmo padrão da barra do app: grupos com rótulo, recolhíveis, e lembrados. */}
            {SECTION_GROUPS.map((group) => {
              const isOpen = !collapsed.has(group.label);

              return (
                <SidebarSection
                  key={group.label}
                  label={group.label}
                  open={isOpen}
                  onToggle={() => toggleGroup(group.label)}
                  hasActive={group.ids.includes(sectionId)}
                  activeLabel={`Seção atual em ${group.label}`}
                >
                  <SidebarMenu>
                    {group.ids.map((id) => {
                      const info = SECTIONS.find((candidate) => candidate.id === id);
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
                            <span>{info?.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarSection>
              );
            })}
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            {/* A chave troca o bloco a cada seção, que entra com fade (como as páginas do app). */}
            <main
              key={sectionId}
              className={cn(
                'mx-auto flex animate-enter-fade flex-col gap-6 p-8',
                // A galeria do infográfico precisa de mais largura que os formulários.
                sectionId === 'infographic' ? 'max-w-5xl' : 'max-w-2xl',
              )}
            >
              <header>
                <h2 className="text-xl font-semibold tracking-tight">{section.label}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </header>

              {sectionId === 'paths' && <PathsSection onSaved={handleSaved} />}
              {sectionId === 'appearance' && <AppearanceSection />}
              {sectionId === 'infographic' && <InfographicGallerySection />}
              {sectionId === 'ai' && <DefaultAiSection />}
              {sectionId === 'external' && <ExternalProvidersSection onSaved={handleSaved} />}
              {sectionId === 'local' && <LocalProvidersSection onSaved={handleSaved} />}
              {sectionId === 'prompts' && <PromptsSection />}
              {sectionId === 'components' && <ComponentsSection />}
              {sectionId === 'access' && <AccessSection />}
              {sectionId === 'backup' && <BackupSection onSaved={handleSaved} />}
              {sectionId === 'updates' && <UpdatesSection />}
            </main>
          </ScrollArea>

          {restartPending && <RestartBanner onRestart={() => void relaunchApp()} />}
        </div>
      </div>
      </div>
    </SnackbarProvider>
  );
}
