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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#ui/sidebar';

import { IpcChannels } from '../../src/shared/channels';
import { ipc } from '../ipc';

/**
 * CÓPIA do desktop de front/src/components/AppSidebar.tsx, com um item de
 * Configurações no rodapé que abre a janela de Configurações do Electron.
 * Se o front mudar, o teste de overrides avisa: reconcilie e rode
 * `npm run overrides:update`.
 */
const navigation = [
  {
    label: 'HomeLab',
    items: [
      {
        title: 'Início',
        url: '/',
        icon: Home,
      },
    ],
  },
  {
    label: 'Biblioteca',
    items: [
      {
        title: 'Páginas',
        url: '/library',
        icon: Library,
      },
      {
        title: 'Livros',
        url: '/library/books',
        icon: BookOpen,
      },
      {
        title: 'Entrada',
        url: '/library/inbox',
        icon: Inbox,
      },
      {
        title: 'Nova página',
        url: '/library/new',
        icon: FilePlus,
      },
    ],
  },
  {
    label: 'AI',
    items: [
      {
        title: 'Chat',
        url: 'ai/chat',
        icon: MessageSquare,
      },
      {
        title: 'Uso',
        url: 'ai/usage',
        icon: Gauge,
      },
    ],
  },
  {
    label: 'Jobs',
    items: [
      {
        title: 'Criar',
        url: 'jobs/create',
        icon: LayersPlus,
      },
      {
        title: 'Inspeção',
        url: 'jobs/track',
        icon: StepForward,
      },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sidebar>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.url)}
                        className="select-none"
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
              className="select-none"
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
