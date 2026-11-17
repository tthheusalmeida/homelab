import type { ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { failure, mockApi, ok, payloadsOf } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { ReadingQuickControls } from './ReadingQuickControls';

const renderControls = (ui: ReactNode = <ReadingQuickControls />) =>
  render(<AppearanceProvider>{ui}</AppearanceProvider>);

function mockSaved(reading: Partial<typeof DEFAULT_READING> = {}) {
  let current = { ...DEFAULT_READING, ...reading };

  return mockApi({
    [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, reading: current }),
    [IpcChannels.appearance.update]: (patch) => {
      current = { ...current, ...(patch as { reading: object }).reading };

      return ok({ ...DEFAULT_APPEARANCE, reading: current });
    },
  });
}

describe('ReadingQuickControls', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when shown, should display the saved font size and zoom', async () => {
    mockSaved({ fontSize: 20, zoom: 130 });

    renderControls();

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Letra' })).toHaveTextContent('20'),
    );
    expect(screen.getByRole('status', { name: 'Zoom' })).toHaveTextContent('130%');
  });

  it('when increasing the letter, should save the next size (2 up) and show it', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { fontSize: 18 } },
    ]);
    expect(screen.getByRole('status', { name: 'Letra' })).toHaveTextContent('18');
  });

  it('when decreasing the letter, should save the previous size (2 down)', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Diminuir a letra' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { fontSize: 14 } },
    ]);
  });

  it('when changing the zoom, should save it in steps of 10 without touching the letter', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Aumentar o zoom' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir o zoom' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir o zoom' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { zoom: 110 } },
      { reading: { zoom: 100 } },
      { reading: { zoom: 90 } },
    ]);
    expect(screen.getByRole('status', { name: 'Letra' })).toHaveTextContent('16');
  });

  it('when the letter is at the minimum, should disable decreasing', async () => {
    mockSaved({ fontSize: 8 });

    renderControls();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Diminuir a letra' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Aumentar a letra' })).toBeEnabled();
  });

  it('when the zoom is at the maximum, should disable increasing', async () => {
    mockSaved({ zoom: 200 });

    renderControls();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Aumentar o zoom' })).toBeDisabled(),
    );
  });

  it('when saving fails, should go back to the previous value without breaking', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.appearance.get]: () => ok(DEFAULT_APPEARANCE),
      [IpcChannels.appearance.update]: () => failure('VALIDATION', 'Não foi possível salvar.'),
    });
    renderControls();

    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Letra' })).toHaveTextContent('16'),
    );
  });

  it('when there is no provider, should show the defaults and ignore clicks', async () => {
    const user = userEvent.setup();

    render(<ReadingQuickControls />);

    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    expect(screen.getByRole('status', { name: 'Letra' })).toHaveTextContent('16');
  });
});
