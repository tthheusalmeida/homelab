import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { setupStatus } from '#test/components-fixtures';
import { renderWithQuery } from '#test/utils';

import { SidebarProvider } from '#ui/sidebar';

import { SettingsApp } from './SettingsApp';
import { SECTION_GROUPS, SECTIONS, SETTINGS_COLLAPSED_KEY } from './strings';
import { mockApi, ok } from './testing';

const handlers = {
  [IpcChannels.settings.get]: () => ok({ libraryDir: 'D:/lib' }),
  [IpcChannels.components.status]: () => ok(setupStatus()),
};

describe('SECTION_GROUPS', () => {
  it('when listing the groups, should place every section in exactly one group', () => {
    const ids = SECTION_GROUPS.flatMap((group) => [...group.ids]);

    expect([...ids].sort()).toEqual(SECTIONS.map((section) => section.id).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/** Só o menu lateral: o tema "Sistema" também aparece no conteúdo da Aparência. */
const menu = () => within(screen.getByLabelText('Seções de configuração'));

describe('SettingsApp menu groups', () => {
  beforeEach(() => window.localStorage.clear());

  it('when opened, should show the groups in order with their sections', () => {
    mockApi(handlers);

    renderWithQuery(
      <AppearanceProvider>
        <SidebarProvider><SettingsApp /></SidebarProvider>
      </AppearanceProvider>,
    );

    const labels = ['Geral', 'IA', 'Sistema'].map((label) => menu().getByText(label));

    labels.slice(1).forEach((element, index) => {
      expect(
        labels[index].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    const items = [
      'Aparência',
      'Biblioteca',
      'Infográfico',
      'IAs externas',
      'Serviços locais',
      'Componentes',
      'Acessos',
      'Backup',
      'Sobre',
    ].map((name) => screen.getByRole('button', { name }));

    // a ordem do menu é a do app: Aparência vem antes de Biblioteca
    items.slice(1).forEach((element, index) => {
      expect(
        items[index].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it('when a group is collapsed, should hide its sections and remember it', async () => {
    mockApi(handlers);

    renderWithQuery(
      <AppearanceProvider>
        <SidebarProvider><SettingsApp /></SidebarProvider>
      </AppearanceProvider>,
    );
    await userEvent.click(menu().getByText('Sistema'));

    expect(screen.queryByRole('button', { name: 'Backup' })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_COLLAPSED_KEY) ?? '[]')).toEqual([
      'Sistema',
    ]);
  });

  it('when the group of the current section is collapsed, should show the highlight dot', async () => {
    mockApi(handlers);

    renderWithQuery(
      <AppearanceProvider>
        <SidebarProvider><SettingsApp /></SidebarProvider>
      </AppearanceProvider>,
    );
    await userEvent.click(menu().getByText('Geral'));

    expect(screen.getByLabelText('Seção atual em Geral')).toBeInTheDocument();
  });

  it('when a group was collapsed before, should open collapsed', () => {
    window.localStorage.setItem(SETTINGS_COLLAPSED_KEY, JSON.stringify(['IA']));
    mockApi(handlers);

    renderWithQuery(
      <AppearanceProvider>
        <SidebarProvider><SettingsApp /></SidebarProvider>
      </AppearanceProvider>,
    );

    expect(screen.queryByRole('button', { name: 'IAs externas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Biblioteca' })).toBeInTheDocument();
  });

  it('when another section is chosen, should switch the page', async () => {
    mockApi(handlers);

    renderWithQuery(
      <AppearanceProvider>
        <SidebarProvider><SettingsApp /></SidebarProvider>
      </AppearanceProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Backup' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Backup' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Backup' })).toHaveAttribute('aria-current', 'page');
  });
});
