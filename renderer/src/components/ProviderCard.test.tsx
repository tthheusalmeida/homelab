import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProviderCard } from './ProviderCard';

const renderCard = (props: Partial<Parameters<typeof ProviderCard>[0]> = {}) =>
  render(
    <ProviderCard
      title="Whisper"
      description="Transcreve os áudios localmente."
      badge={<span>Selo</span>}
      footer={<button>Salvar</button>}
      {...props}
    >
      <p>Campos do provider</p>
    </ProviderCard>,
  );

describe('ProviderCard', () => {
  it('when rendered, should show only the title, badge and one-line description, collapsed', () => {
    renderCard();

    const trigger = screen.getByRole('button', { name: /^Whisper/ });

    expect(trigger).toHaveTextContent('Selo');
    expect(trigger).toHaveTextContent('Transcreve os áudios localmente.');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Campos do provider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('when the header is clicked, should open the content and the footer actions', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^Whisper/ }));

    expect(screen.getByRole('button', { name: /^Whisper/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Campos do provider')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeVisible();
  });

  it('when opened and clicked again, should collapse', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^Whisper/ }));
    await user.click(screen.getByRole('button', { name: /^Whisper/ }));

    await waitFor(() => expect(screen.queryByText('Campos do provider')).not.toBeInTheDocument());
  });

  it('when defaultOpen is set, should start expanded', () => {
    renderCard({ defaultOpen: true });

    expect(screen.getByText('Campos do provider')).toBeVisible();
  });

  it('when there is no footer, should render only the content', async () => {
    const user = userEvent.setup();
    renderCard({ footer: undefined });

    await user.click(screen.getByRole('button', { name: /^Whisper/ }));

    expect(screen.getByText('Campos do provider')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });
});
