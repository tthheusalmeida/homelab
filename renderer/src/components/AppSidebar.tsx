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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#ui/sidebar';

import { Logo } from '#components/Hex';
import { IpcChannels } from '#shared/channels';
import { ipc } from '#lib/ipc';

/** Navegação do app. Ordem: HomeLab (Início), IA, Biblioteca e Tarefas; Configurações fica no rodapé. */
export const navigation = [
  {
    // Sem rótulo: o logo do topo já diz "HomeLab".
    label: '',
    items: [{ title: 'Início', url: '/', icon: Home }],
  },
  {
    label: 'IA',
    items: [
      { title: 'Conversa', url: '/ai/chat', icon: MessageSquare },
      { title: 'Consumo', url: '/ai/usage', icon: Gauge },
    ],
  },
  {
    label: 'Biblioteca',
    items: [
      { title: 'Páginas', url: '/library', icon: Library },
      { title: 'Livros', url: '/library/books', icon: BookOpen },
      { title: 'Caixa de entrada', url: '/library/inbox', icon: Inbox },
      { title: 'Nova página', url: '/library/new', icon: FilePlus },
    ],
  },
  {
    label: 'Tarefas',
    items: [
      { title: 'Nova tarefa', url: '/jobs/create', icon: LayersPlus },
      { title: 'Acompanhar', url: '/jobs/track', icon: StepForward },
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

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 pt-1 font-semibold tracking-tight select-none">
          <Logo />
          <span>HomeLab</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.url === activeUrl;

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
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
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
