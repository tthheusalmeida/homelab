import {
  BookOpen,
  FilePlus,
  Gauge,
  Home,
  Inbox,
  LayersPlus,
  Library,
  MessageSquare,
  Settings,
  StepForward,
} from 'lucide-react';

import { useLocation, useNavigate } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#ui/sidebar';

import { Logo } from '#components/Hex';
import { SidebarSection } from '#components/SidebarSection';
import { SidebarSetupProgress } from '#components/SidebarSetupProgress';
import { useCollapsedGroups } from '#hooks/use-collapsed-groups';
import { useActiveJobsCount } from '../pages/jobs/track/hooks/useActiveJobsCount';
import { useInboxCount } from '../pages/library/hooks/useLibrary';
import { IpcChannels } from '#shared/channels';
import { ipc } from '#lib/ipc';

/** Tela dos jobs: o item do menu mostra quantos estão em andamento. */
const JOBS_URL = '/jobs/track';
/** Caixa de entrada: o item do menu mostra quantas páginas aguardam decisão. */
const INBOX_URL = '/library/inbox';

/**
 * Navegação do app. Ordem: HomeLab (Início), Biblioteca, Tarefas e IA (por último); Configurações fica
 * no rodapé. Cada seção com rótulo pode ser recolhida (e o app lembra quais).
 */
export const navigation = [
  {
    // Sem rótulo: o logo do topo já diz "HomeLab".
    label: '',
    items: [{ title: 'Início', url: '/', icon: Home }],
  },
  {
    label: 'Biblioteca',
    items: [
      { title: 'Páginas', url: '/library', icon: Library },
      { title: 'Livros', url: '/library/books', icon: BookOpen },
      { title: 'Caixa de entrada', url: INBOX_URL, icon: Inbox },
      { title: 'Nova página', url: '/library/new', icon: FilePlus },
    ],
  },
  {
    label: 'Tarefas',
    items: [
      { title: 'Nova tarefa', url: '/jobs/create', icon: LayersPlus },
      { title: 'Em andamento', url: '/jobs/track', icon: StepForward },
    ],
  },
  {
    label: 'IA',
    items: [
      { title: 'Conversa', url: '/ai/chat', icon: MessageSquare },
      { title: 'Consumo', url: '/ai/usage', icon: Gauge },
    ],
  },
];

/**
 * Item do menu que representa a rota atual: o endereço mais específico que contém o caminho
 * (ex.: `/library/books/abc` ativa "Livros", e `/library/new` ativa só "Nova página").
 */
export function findActiveUrl(pathname: string, urls: readonly string[]): string | null {
  const matches = urls.filter(
    (url) => pathname === url || (url !== '/' && pathname.startsWith(`${url}/`)),
  );

  return matches.sort((first, second) => second.length - first.length)[0] ?? null;
}

const navigationUrls = navigation.flatMap((group) => group.items.map((item) => item.url));

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeUrl = findActiveUrl(location.pathname, navigationUrls);
  const [collapsed, toggleGroup] = useCollapsedGroups();
  const activeJobs = useActiveJobsCount();
  const inboxCount = useInboxCount();
  const badges: Record<string, { count: number; label: string }> = {
    [JOBS_URL]: { count: activeJobs, label: `${activeJobs} em andamento` },
    [INBOX_URL]: { count: inboxCount, label: `${inboxCount} na caixa de entrada` },
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 pt-1 font-semibold tracking-tight select-none">
          <Logo />
          <span>HomeLab</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => {
          const menu = (
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = item.url === activeUrl;
                const badge = badges[item.url];

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.url)}
                      className="select-none text-[13px] [&_svg]:size-[15px]"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>

                    {badge && badge.count > 0 && (
                      <SidebarMenuBadge
                        aria-label={badge.label}
                        className="bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground"
                      >
                        {badge.count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          );

          // Sem rótulo (o grupo do Início) não há o que recolher.
          if (!group.label) {
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupContent>{menu}</SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const isOpen = !collapsed.has(group.label);
          const hasActive = group.items.some((item) => item.url === activeUrl);

          return (
            <SidebarSection
              key={group.label}
              label={group.label}
              open={isOpen}
              onToggle={() => toggleGroup(group.label)}
              hasActive={hasActive}
            >
              {menu}
            </SidebarSection>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSetupProgress />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void ipc.invoke(IpcChannels.app.openSettings)}
              className="select-none text-[13px] [&_svg]:size-[15px]"
            >
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
