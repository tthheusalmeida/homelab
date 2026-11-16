import { Link } from "react-router";
import { FilePlus, Inbox, LayersPlus, MessageSquare, type LucideIcon } from "lucide-react";

import { goShortcutLabel } from "#lib/shortcuts";

import { HomeBaseSection } from "./BaseSection";

const ACTIONS: { title: string; to: string; icon: LucideIcon }[] = [
  { title: "Nova tarefa", to: "/jobs/create", icon: LayersPlus },
  { title: "Nova página", to: "/library/new", icon: FilePlus },
  { title: "Conversa", to: "/ai/chat", icon: MessageSquare },
  { title: "Caixa de entrada", to: "/library/inbox", icon: Inbox },
];

/** Atalhos para o que mais se faz, com a tecla de cada um (`G` e uma letra). */
export function QuickActions() {
  return (
    <HomeBaseSection
      title="Atalhos"
      subtitle="Comece por aqui. Ctrl K abre a busca em qualquer tela."
      titleMono="/shortcuts"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map(({ title, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/50 hover:ring-3 hover:ring-primary/15"
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4 text-brand" />
              {title}
            </span>

            <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              {goShortcutLabel(to)}
            </kbd>
          </Link>
        ))}
      </div>
    </HomeBaseSection>
  );
}
