import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf, renderWithProviders } from '../testing';
import { PlatformLoginsStrings } from '../components/PlatformLoginsCard';

import { AccessSection } from './AccessSection';

describe('AccessSection', () => {
  it('when opened, should offer to forget the saved logins', async () => {
    const invoke = mockApi({ [IpcChannels.platform.forgetLogins]: () => ok({ removed: 1 }) });

    renderWithProviders(<AccessSection />);
    await userEvent.click(screen.getByRole('button', { name: PlatformLoginsStrings.forget }));

    expect(await screen.findByText('1 login esquecido.')).toBeInTheDocument();
    expect(payloadsOf(invoke, IpcChannels.platform.forgetLogins)).toHaveLength(1);
  });
});
