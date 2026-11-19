import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { ReadingMode } from './ReadingMode';

const setup = (onExit = vi.fn()) => {
  render(
    <ReadingMode title="Pós em DevOps" options={<p>itens do sumário</p>} onExit={onExit}>
      <p>texto para ler</p>
    </ReadingMode>,
  );

  return { onExit, user: userEvent.setup() };
};

describe('ReadingMode', () => {
  it('when open, should show only the title and the text, with the side panel hidden', () => {
    setup();

    const region = screen.getByRole('region', { name: 'Modo leitura' });

    expect(within(region).getByText('Pós em DevOps')).toBeInTheDocument();
    expect(within(region).getByText('texto para ler')).toBeInTheDocument();
    expect(screen.queryByText('itens do sumário')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Sumário da leitura' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="reading-edge-right"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /painel lateral/ })).not.toBeInTheDocument();
  });

  it('when the mouse enters the right margin, should show the items over the text', async () => {
    const { user } = setup();

    await user.hover(document.querySelector('[data-slot="reading-edge-right"]') as HTMLElement);

    expect(
      within(screen.getByRole('complementary', { name: 'Sumário da leitura' })).getByText(
        'itens do sumário',
      ),
    ).toBeInTheDocument();
  });

  it('when the side panel is pinned in the settings, should keep it always visible beside the text', async () => {
    mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({
          ...DEFAULT_APPEARANCE,
          reading: { ...DEFAULT_READING, pinSidebar: true },
        }),
    });

    render(
      <AppearanceProvider>
        <ReadingMode title="Pós" options={<p>itens do sumário</p>} onExit={vi.fn()}>
          <p>texto para ler</p>
        </ReadingMode>
      </AppearanceProvider>,
    );

    expect(
      await screen.findByRole('complementary', { name: 'Opções da leitura' }),
    ).toBeInTheDocument();
    expect(screen.getByText('itens do sumário')).toBeInTheDocument();
    expect(document.querySelector('[data-slot^="reading-edge"]')).toBeNull();
  });

  it('when open, should cover the whole screen on top of the app', () => {
    setup();

    expect(screen.getByRole('region', { name: 'Modo leitura' })).toHaveClass(
      'fixed',
      'inset-0',
      'z-50',
    );
  });

  it('when open, should render outside the page tree so it covers the layout', () => {
    const { container } = render(
      <div>
        <ReadingMode title="T" options={null} onExit={() => {}}>
          <p>x</p>
        </ReadingMode>
      </div>,
    );

    expect(container).not.toContainElement(screen.getByRole('region', { name: 'Modo leitura' }));
  });

  it('when the exit button is clicked, should call onExit', async () => {
    const { onExit, user } = setup();

    await user.click(screen.getByRole('button', { name: /Sair do modo leitura/ }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('when Escape is pressed, should call onExit', async () => {
    const { onExit, user } = setup();

    await user.keyboard('{Escape}');

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('when another key is pressed, should not exit', async () => {
    const { onExit, user } = setup();

    await user.keyboard('a');

    expect(onExit).not.toHaveBeenCalled();
  });

  it('when closed, should stop listening to Escape', async () => {
    const onExit = vi.fn();
    const { unmount } = render(
      <ReadingMode title="T" options={null} onExit={onExit}>
        <p>x</p>
      </ReadingMode>,
    );
    unmount();

    await userEvent.setup().keyboard('{Escape}');

    expect(onExit).not.toHaveBeenCalled();
  });
});

describe('ReadingMode — reading preferences', () => {
  it('when open, should use the reading surface so font, size and colors follow the preferences', () => {
    setup();

    const region = screen.getByRole('region', { name: 'Modo leitura' });

    expect(region).toHaveClass('reading-surface');
    expect(region).toHaveAttribute('data-slot', 'reading-surface');
    expect(region.style.fontSize).toBe('1rem');
  });

  it('when open, should not wrap the whole screen in a padded panel', () => {
    setup();

    expect(screen.getByRole('region', { name: 'Modo leitura' })).not.toHaveAttribute('data-framed');
  });

  it('when open, should keep the top bar and the summary in the interface font', async () => {
    const { user } = setup();

    await user.hover(document.querySelector('[data-slot="reading-edge-right"]') as HTMLElement);

    const region = screen.getByRole('region', { name: 'Modo leitura' });

    expect(within(region).getByText('Pós em DevOps').parentElement).toHaveClass('font-sans');
    expect(within(region).getByRole('complementary', { name: 'Sumário da leitura' })).toHaveClass(
      'font-sans',
    );
  });

  it('when open, should paint the top bar with the soft chrome colors, less emphasized than the text', () => {
    setup();

    const region = screen.getByRole('region', { name: 'Modo leitura' });

    expect(within(region).getByText('Pós em DevOps').parentElement).toHaveClass('reading-chrome');
    expect(within(region).getByText('Pós em DevOps').parentElement?.className).not.toContain(
      'bg-background',
    );
  });
});

describe('ReadingMode — follow and options', () => {
  const renderSplit = () =>
    render(
      <ReadingMode
        title="T"
        follow={<p>onde estou</p>}
        options={<p>ajustes</p>}
        onExit={() => {}}
      >
        <p>texto</p>
      </ReadingMode>,
    );

  it('when the panels are hidden and there is a follow part, should reveal each on hover of its own margin, follow on the left and options on the right', async () => {
    renderSplit();
    const user = userEvent.setup();

    await user.hover(document.querySelector('[data-slot="reading-edge-left"]') as HTMLElement);
    const left = screen.getByRole('complementary', { name: 'Acompanhamento da leitura' });

    expect(within(left).getByText('onde estou')).toBeInTheDocument();
    expect(left).toHaveClass('left-4', 'animate-enter-left');
    expect(screen.queryByText('ajustes')).not.toBeInTheDocument();

    await user.hover(document.querySelector('[data-slot="reading-edge-right"]') as HTMLElement);
    const right = screen.getByRole('complementary', { name: 'Opções da leitura' });

    expect(within(right).getByText('ajustes')).toBeInTheDocument();
    expect(right).toHaveClass('right-6');
  });

  it('when there is no follow part, should show only the options panel, without the left margin strip', async () => {
    setup();

    await userEvent.setup().hover(document.querySelector('[data-slot="reading-edge-right"]') as HTMLElement);

    expect(document.querySelector('[data-slot="reading-edge-left"]')).toBeNull();
    expect(screen.getByText('itens do sumário')).toBeInTheDocument();
  });

  it('when the panel is pinned, should put the follow part on the left and the options on the right of the text', async () => {
    mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({ ...DEFAULT_APPEARANCE, reading: { ...DEFAULT_READING, pinSidebar: true } }),
    });

    render(
      <AppearanceProvider>
        <ReadingMode title="T" follow={<p>onde estou</p>} options={<p>ajustes</p>} onExit={() => {}}>
          <p>texto</p>
        </ReadingMode>
      </AppearanceProvider>,
    );

    const left = await screen.findByRole('complementary', { name: 'Acompanhamento da leitura' });
    const right = screen.getByRole('complementary', { name: 'Opções da leitura' });
    const text = screen.getByText('texto');

    expect(within(left).getByText('onde estou')).toBeInTheDocument();
    expect(within(right).getByText('ajustes')).toBeInTheDocument();
    expect(left.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
