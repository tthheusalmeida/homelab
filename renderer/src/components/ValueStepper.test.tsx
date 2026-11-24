import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ValueStepper } from './ValueStepper';

const setup = (overrides: Partial<React.ComponentProps<typeof ValueStepper>> = {}) => {
  const onDecrease = vi.fn();
  const onIncrease = vi.fn();

  render(
    <ValueStepper
      label="Letra"
      value="16"
      decreaseLabel="Diminuir a letra"
      increaseLabel="Aumentar a letra"
      canDecrease
      canIncrease
      decreaseIcon={<span>-</span>}
      increaseIcon={<span>+</span>}
      onDecrease={onDecrease}
      onIncrease={onIncrease}
      {...overrides}
    />,
  );

  return { onDecrease, onIncrease };
};

describe('ValueStepper', () => {
  it('when shown, should use the standard icon button size (32px), not the tiny one', () => {
    setup();

    for (const name of ['Diminuir a letra', 'Aumentar a letra']) {
      expect(screen.getByRole('button', { name })).toHaveClass('size-8');
      expect(screen.getByRole('button', { name })).not.toHaveClass('size-6');
    }
  });

  it('when the buttons are clicked, should ask for one step down or up', async () => {
    const user = userEvent.setup();
    const { onDecrease, onIncrease } = setup();

    await user.click(screen.getByRole('button', { name: 'Diminuir a letra' }));
    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    expect(onDecrease).toHaveBeenCalledTimes(1);
    expect(onIncrease).toHaveBeenCalledTimes(1);
  });

  it('when at the limits, should disable the matching button', () => {
    setup({ canDecrease: false });

    expect(screen.getByRole('button', { name: 'Diminuir a letra' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aumentar a letra' })).toBeEnabled();
  });

  it('when the label is hidden, should keep the value named for screen readers', () => {
    setup({ hideLabel: true });

    expect(screen.queryByText('Letra')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Letra')).toHaveTextContent('16');
  });
});
