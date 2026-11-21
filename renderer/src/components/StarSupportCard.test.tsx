import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { CRITICAL_POINT_MS, REPOSITORY_URL, THANKS_VISIBLE_MS } from '#lib/support-text';

import { failure, mockApi, ok, payloadsOf, renderWithProviders } from '../../settings/src/testing';
import { StarSupportCard } from './StarSupportCard';

const withChoice = (starPromptHidden: boolean, extra: Record<string, () => unknown> = {}) =>
  mockApi({
    [IpcChannels.support.get]: () => ok({ starPromptHidden }),
    [IpcChannels.support.update]: () => ok({ starPromptHidden: true }),
    ...extra,
  });

describe('StarSupportCard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('when the prompt was never answered, should invite to star the project', async () => {
    withChoice(false);

    renderWithProviders(<StarSupportCard />);

    expect(await screen.findByText(/estrela no GitHub/)).toBeVisible();
  });

  it('when the user already hid the prompt, should show nothing', async () => {
    const invoke = withChoice(true);

    renderWithProviders(<StarSupportCard />);

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.support.get)).toHaveLength(1));
    expect(screen.queryByText(/estrela no GitHub/)).not.toBeInTheDocument();
  });

  it('when the choice is still loading, should show nothing', () => {
    withChoice(false);

    renderWithProviders(<StarSupportCard />);

    expect(screen.queryByText(/estrela no GitHub/)).not.toBeInTheDocument();
  });

  it('when the user opens GitHub, should open the repository and keep the prompt', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const invoke = withChoice(false);
    renderWithProviders(<StarSupportCard />);

    await userEvent.click(await screen.findByRole('button', { name: 'Abrir no GitHub' }));

    expect(open).toHaveBeenCalledWith(REPOSITORY_URL, '_blank', 'noopener,noreferrer');
    expect(payloadsOf(invoke, IpcChannels.support.update)).toEqual([]);
    expect(screen.getByText(/estrela no GitHub/)).toBeVisible();
  });

  it('when the user says they already starred, should thank them and save the choice without opening GitHub', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const invoke = withChoice(false);
    renderWithProviders(<StarSupportCard />);

    await userEvent.click(await screen.findByRole('button', { name: 'Já dei minha estrela' }));

    expect(await screen.findByText('Obrigado pelo apoio!')).toBeVisible();
    expect(screen.queryByText(/estrela no GitHub/)).not.toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.support.update)).toEqual([{ starPromptHidden: true }]),
    );
  });

  describe('thank-you sequence', () => {
    const startThanks = async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      withChoice(false);
      renderWithProviders(<StarSupportCard />);
      await user.click(await screen.findByRole('button', { name: 'Já dei minha estrela' }));
    };

    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('when the user says they already starred, should show the imploding logo with no confetti yet', async () => {
      await startThanks();

      expect(await screen.findByTestId('logo-implosion')).toBeInTheDocument();
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    });

    it('when the hexagons reach the critical point, should burst confetti from the center of the logo', async () => {
      await startThanks();
      const logo = await screen.findByTestId('logo-implosion');

      vi.spyOn(logo, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 80, 80));
      await act(async () => {
        vi.advanceTimersByTime(CRITICAL_POINT_MS + 50);
      });

      const confetti = screen.getByTestId('confetti');
      const piece = confetti.children[0] as HTMLElement;

      expect(confetti.parentElement).toBe(document.body);
      expect(confetti).toHaveAttribute('aria-hidden', 'true');
      expect(confetti.children.length).toBeGreaterThanOrEqual(40);
      expect(piece.style.left).toBe('140px');
      expect(piece.style.top).toBe('240px');
    });

    it('when the critical point has not come yet, should hold the confetti', async () => {
      await startThanks();
      await screen.findByTestId('logo-implosion');

      await act(async () => {
        vi.advanceTimersByTime(CRITICAL_POINT_MS - 200);
      });

      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    });

    it('when the thanks have been shown for a while, should leave with the confetti and not come back', async () => {
      await startThanks();
      await screen.findByTestId('logo-implosion');

      // Em dois passos: a saída só é agendada depois de o cartão renderizar a fase "saindo".
      await act(async () => {
        vi.advanceTimersByTime(THANKS_VISIBLE_MS + 50);
      });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByText('Obrigado pelo apoio!')).not.toBeInTheDocument();
      expect(screen.queryByText('Apoie o projeto')).not.toBeInTheDocument();
      expect(screen.queryByTestId('logo-implosion')).not.toBeInTheDocument();
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    });

    it('when saving the choice fails, should leave no logo animation or confetti and go back to the invitation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      withChoice(false, { [IpcChannels.support.update]: () => failure('INTERNAL', 'falhou') });
      renderWithProviders(<StarSupportCard />);
      await user.click(await screen.findByRole('button', { name: 'Já dei minha estrela' }));

      expect(await screen.findByText(/estrela no GitHub/)).toBeVisible();
      await act(async () => {
        vi.advanceTimersByTime(CRITICAL_POINT_MS + 50);
      });
      expect(screen.queryByTestId('logo-implosion')).not.toBeInTheDocument();
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    });
  });
});
