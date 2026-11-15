import { useState } from 'react';
import { Cloud, Cpu, Folder, type LucideIcon } from 'lucide-react';

import { Button } from '#ui/button';
import { ScrollArea } from '#ui/scroll-area';

import { RestartBanner } from './components/RestartBanner';
import { SnackbarProvider } from './components/Snackbar';
import { relaunchApp } from './hooks';
import { ExternalProvidersSection } from './sections/ExternalProvidersSection';
import { LocalProvidersSection } from './sections/LocalProvidersSection';
import { PathsSection } from './sections/PathsSection';
import { SECTIONS, Strings, type SectionId } from './strings';

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  paths: Folder,
  external: Cloud,
  local: Cpu,
};

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
      <div className="flex h-svh bg-background text-foreground">
        <nav
          aria-label="Seções de configuração"
          className="flex w-60 shrink-0 flex-col gap-1 border-r bg-sidebar p-3"
        >
          <div className="px-2 pb-4 pt-3">
            <h1 className="text-lg font-semibold">{Strings.title}</h1>
            <p className="text-xs text-muted-foreground">{Strings.subtitle}</p>
          </div>

          {SECTIONS.map(({ id, label }) => {
            const Icon = SECTION_ICONS[id];

            return (
              <Button
                key={id}
                variant={id === sectionId ? 'secondary' : 'ghost'}
                aria-current={id === sectionId ? 'page' : undefined}
                className="justify-start"
                onClick={() => setSectionId(id)}
              >
                <Icon /> {label}
              </Button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
              <header>
                <h2 className="text-xl font-semibold">{section.label}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </header>

              {sectionId === 'paths' && <PathsSection onSaved={handleSaved} />}
              {sectionId === 'external' && <ExternalProvidersSection onSaved={handleSaved} />}
              {sectionId === 'local' && <LocalProvidersSection onSaved={handleSaved} />}
            </main>
          </ScrollArea>

          {restartPending && <RestartBanner onRestart={() => void relaunchApp()} />}
        </div>
      </div>
    </SnackbarProvider>
  );
}
