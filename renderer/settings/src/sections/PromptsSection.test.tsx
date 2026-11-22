import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import {
  PROMPT_LIMITS,
  type PromptSaveRequest,
  type PromptVersion,
  type PromptsOverview,
} from '#shared/contracts/prompts';

import { failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { PromptsSection } from './PromptsSection';

const DEFAULT_TEXT = 'Você cria o mapa mental de um resumo, para revisão e memorização.';

/** Um back de mentira com estado: cada canal devolve a visão completa já atualizada, como o real. */
function mockPrompts(initial: { versions?: PromptVersion[]; activeId?: string | null } = {}) {
  const state = {
    versions: initial.versions ?? [],
    activeId: initial.activeId ?? null,
  };
  const view = (): PromptsOverview => ({
    kinds: [
      {
        kind: 'mindMap',
        label: 'Mapa mental',
        description: 'Como a IA monta o mapa mental de revisão de um resumo.',
        defaultText: DEFAULT_TEXT,
        versions: structuredClone(state.versions),
        activeId: state.activeId,
      },
    ],
    limits: PROMPT_LIMITS,
  });

  const invoke = mockApi({
    [IpcChannels.prompts.list]: () => ok(view()),
    [IpcChannels.prompts.save]: (request) => {
      const { id, name, text, activate } = request as PromptSaveRequest;
      const newId = id ?? `v${state.versions.length + 1}`;

      if (id) {
        state.versions = state.versions.map((version) =>
          version.id === id ? { id, name, text } : version,
        );
      } else {
        state.versions = [...state.versions, { id: newId, name, text }];
      }

      if (activate) {
        state.activeId = newId;
      }

      return ok(view());
    },
    [IpcChannels.prompts.delete]: (request) => {
      const { id } = request as { id: string };

      state.versions = state.versions.filter((version) => version.id !== id);
      state.activeId = state.activeId === id ? null : state.activeId;

      return ok(view());
    },
    [IpcChannels.prompts.activate]: (request) => {
      state.activeId = (request as { id: string | null }).id;

      return ok(view());
    },
  });

  return { invoke, state };
}

const longText = (suffix = '') =>
  `${'Instruções do usuário para o mapa mental. '.repeat(3)}${suffix}`;

const version = (id: string, name: string, text = longText(id)): PromptVersion => ({
  id,
  name,
  text,
});

describe('PromptsSection', () => {
  beforeEach(() => localStorage.clear());

  it('when opened, should explain that only the instructions change and the app keeps the rest', async () => {
    mockPrompts();

    renderWithProviders(<PromptsSection />);

    expect(await screen.findByRole('note')).toHaveTextContent('Você muda só as instruções');
    expect(screen.getByRole('note')).toHaveTextContent('formato da resposta');
  });

  it('when there are no versions yet, should say the app default is in use', async () => {
    mockPrompts();

    renderWithProviders(<PromptsSection />);

    expect(await screen.findByText(/ainda não criou nenhuma versão/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Padrão do app');
  });

  it('when the prompts fail to load, should alert at the footer and offer to try again', async () => {
    mockApi({ [IpcChannels.prompts.list]: () => failure('INTERNAL', 'x') });

    renderWithProviders(<PromptsSection />);

    expect(await screen.findByText('Não foi possível carregar os prompts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  describe('new version', () => {
    it('when starting a new version, should open the editor with the app default as the starting text', async () => {
      mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));

      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByLabelText('Instruções')).toHaveValue(DEFAULT_TEXT);
      expect(within(dialog).getByLabelText('Nome')).toHaveValue('');
      expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();
    });

    it('when the name is filled and saved, should create the version, use it and show the saved notice', async () => {
      const { invoke } = mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));

      const dialog = await screen.findByRole('dialog');

      await user.type(within(dialog).getByLabelText('Nome'), 'Revisão para prova');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.save)).toEqual([
          { kind: 'mindMap', name: 'Revisão para prova', text: DEFAULT_TEXT, activate: true },
        ]),
      );
      expect(await screen.findByText('Versão salva.')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      const list = screen.getByRole('list', { name: 'Suas versões' });

      expect(within(list).getByText('Revisão para prova')).toBeInTheDocument();
      expect(within(list).getByText('Em uso')).toBeInTheDocument();
    });

    it('when the user does not want to use it yet, should save without activating', async () => {
      const { invoke } = mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));

      const dialog = await screen.findByRole('dialog');

      await user.type(within(dialog).getByLabelText('Nome'), 'Guardada');
      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.save)[0]).toEqual(
          expect.objectContaining({ activate: false }),
        ),
      );
    });

    it('when the text is too short, should say so, keep Salvar disabled and show the counter', async () => {
      mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));

      const dialog = await screen.findByRole('dialog');

      await user.type(within(dialog).getByLabelText('Nome'), 'Curto');
      await user.clear(within(dialog).getByLabelText('Instruções'));
      await user.type(within(dialog).getByLabelText('Instruções'), 'curto demais');

      expect(
        within(dialog).getByText(`Escreva pelo menos ${PROMPT_LIMITS.minChars} caracteres.`),
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();
      expect(within(dialog).getByLabelText('Caracteres usados')).toHaveTextContent(
        `12/${PROMPT_LIMITS.maxChars}`,
      );
    });

    it('when the back refuses the text, should show its message as an alert and keep the editor open', async () => {
      mockPrompts();
      mockApi({
        [IpcChannels.prompts.list]: () =>
          ok({
            kinds: [
              {
                kind: 'mindMap',
                label: 'Mapa mental',
                description: 'd',
                defaultText: DEFAULT_TEXT,
                versions: [],
                activeId: null,
              },
            ],
            limits: PROMPT_LIMITS,
          }),
        [IpcChannels.prompts.save]: () =>
          failure('VALIDATION', 'Já existe uma versão com esse nome.'),
      });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));

      const dialog = await screen.findByRole('dialog');

      await user.type(within(dialog).getByLabelText('Nome'), 'Repetida');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Já existe uma versão com esse nome.')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('when closing with unsaved changes, should ask before discarding and keep editing on cancel', async () => {
      mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));
      await user.type(await screen.findByLabelText('Nome'), 'Rascunho');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(await screen.findByText('Descartar as mudanças?')).toBeInTheDocument();

      await user.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);

      expect(screen.getByLabelText('Nome')).toHaveValue('Rascunho');
    });

    it('when confirming the discard, should close the editor without saving', async () => {
      const { invoke } = mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Nova versão/ }));
      await user.type(await screen.findByLabelText('Nome'), 'Rascunho');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      await user.click(await screen.findByRole('button', { name: 'Descartar' }));

      await waitFor(() => expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument());
      expect(payloadsOf(invoke, IpcChannels.prompts.save)).toEqual([]);
    });
  });

  describe('versions', () => {
    it('when there are versions, should list them with the one in use marked and a Usar button on the others', async () => {
      mockPrompts({ versions: [version('a', 'Curta'), version('b', 'Longa')], activeId: 'a' });

      renderWithProviders(<PromptsSection />);

      const list = await screen.findByRole('list', { name: 'Suas versões' });
      const [first, second] = within(list).getAllByRole('listitem');

      expect(within(first).getByText('Em uso')).toBeInTheDocument();
      expect(within(first).queryByRole('button', { name: 'Usar' })).not.toBeInTheDocument();
      expect(within(second).getByRole('button', { name: 'Usar' })).toBeInTheDocument();
    });

    it('when using another version, should activate it right away and say which one is in use', async () => {
      const { invoke } = mockPrompts({ versions: [version('a', 'Curta'), version('b', 'Longa')] });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);

      const list = await screen.findByRole('list', { name: 'Suas versões' });

      await user.click(
        within(within(list).getAllByRole('listitem')[1]).getByRole('button', { name: 'Usar' }),
      );

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.activate)).toEqual([
          { kind: 'mindMap', id: 'b' },
        ]),
      );
      expect(await screen.findByText('Em uso: Longa.')).toBeInTheDocument();
    });

    it('when choosing the app default in the selector, should go back to it', async () => {
      const { invoke } = mockPrompts({ versions: [version('a', 'Curta')], activeId: 'a' });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Padrão do app' }));

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.activate)).toEqual([
          { kind: 'mindMap', id: null },
        ]),
      );
      expect(await screen.findByText('Em uso: Padrão do app.')).toBeInTheDocument();
    });

    it('when editing a version, should open it with its name and text and save with its id', async () => {
      const { invoke } = mockPrompts({ versions: [version('a', 'Curta', longText('original'))] });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);

      const list = await screen.findByRole('list', { name: 'Suas versões' });

      await user.click(within(list).getByRole('button', { name: 'Editar' }));

      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByLabelText('Nome')).toHaveValue('Curta');
      expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();

      await user.clear(within(dialog).getByLabelText('Nome'));
      await user.type(within(dialog).getByLabelText('Nome'), 'Curta v2');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.save)).toEqual([
          {
            kind: 'mindMap',
            id: 'a',
            name: 'Curta v2',
            text: longText('original').trim(),
            activate: false,
          },
        ]),
      );
    });

    it('when duplicating a version, should open a new one with its text and a copy name', async () => {
      mockPrompts({ versions: [version('a', 'Curta', longText('base'))] });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: 'Mais ações: Curta' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Duplicar' }));

      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByLabelText('Nome')).toHaveValue('Curta (cópia)');
      expect(within(dialog).getByLabelText('Instruções')).toHaveValue(longText('base'));
    });

    it('when deleting a version, should ask first and then remove it', async () => {
      const { invoke } = mockPrompts({ versions: [version('a', 'Curta')], activeId: 'a' });
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: 'Mais ações: Curta' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

      expect(await screen.findByText('Excluir "Curta"?')).toBeInTheDocument();
      expect(payloadsOf(invoke, IpcChannels.prompts.delete)).toEqual([]);

      await user.click(screen.getByRole('button', { name: 'Excluir' }));

      await waitFor(() =>
        expect(payloadsOf(invoke, IpcChannels.prompts.delete)).toEqual([
          { kind: 'mindMap', id: 'a' },
        ]),
      );
      expect(await screen.findByText('Versão excluída.')).toBeInTheDocument();
      expect(await screen.findByText(/ainda não criou nenhuma versão/)).toBeInTheDocument();
    });
  });

  describe('app default', () => {
    it('when viewing the default, should show it read-only with no name field and no save', async () => {
      mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Padrão do app: Ver/ }));

      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByLabelText('Instruções')).toHaveAttribute('readonly');
      expect(within(dialog).getByLabelText('Instruções')).toHaveValue(DEFAULT_TEXT);
      expect(within(dialog).queryByLabelText('Nome')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    });

    it('when creating a version from the default, should open the new-version editor with its text', async () => {
      mockPrompts();
      const user = userEvent.setup();

      renderWithProviders(<PromptsSection />);
      await user.click(await screen.findByRole('button', { name: /Padrão do app: Ver/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Criar versão a partir do padrão' }),
      );

      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByText('Nova versão')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Nome')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Instruções')).toHaveValue(DEFAULT_TEXT);
    });
  });
});
