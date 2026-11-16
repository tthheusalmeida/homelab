import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { PlatformLoginsCard, PlatformLoginsStrings } from './PlatformLoginsCard';

describe('PlatformLoginsCard', () => {
  it('when the user forgets the logins, should call the channel and say how many were removed', async () => {
    const invoke = mockApi({ [IpcChannels.platform.forgetLogins]: () => ok({ removed: 4 }) });

    renderWithProviders(<PlatformLoginsCard />);
    await userEvent.click(screen.getByRole('button', { name: PlatformLoginsStrings.forget }));

    expect(await screen.findByText('4 logins esquecidos.')).toBeInTheDocument();
    expect(payloadsOf(invoke, IpcChannels.platform.forgetLogins)).toHaveLength(1);
  });

  it('when there was no saved login, should say so', async () => {
    mockApi({ [IpcChannels.platform.forgetLogins]: () => ok({ removed: 0 }) });

    renderWithProviders(<PlatformLoginsCard />);
    await userEvent.click(screen.getByRole('button', { name: PlatformLoginsStrings.forget }));

    expect(await screen.findByText(PlatformLoginsStrings.none)).toBeInTheDocument();
  });

  it('when forgetting fails, should show the error', async () => {
    mockApi({
      [IpcChannels.platform.forgetLogins]: () => failure('PERSIST_FAILED', 'Disco cheio'),
    });

    renderWithProviders(<PlatformLoginsCard />);
    await userEvent.click(screen.getByRole('button', { name: PlatformLoginsStrings.forget }));

    expect(await screen.findByText('Disco cheio')).toBeInTheDocument();
  });
});
