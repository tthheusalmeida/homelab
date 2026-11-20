import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_READING, READING_FONT_SIZE, READING_ZOOM } from '#shared/contracts/reading';

import { ReadingSteppers } from './ReadingSteppers';

const setup = (reading = DEFAULT_READING, zoomHint?: string) => {
  const change = vi.fn();

  render(
    <ReadingSteppers
      reading={reading}
      change={change}
      fontLabel="Letra"
      zoomLabel="Zoom"
      zoomHint={zoomHint}
    />,
  );

  return change;
};

describe('ReadingSteppers', () => {
  it('when increasing the font, should ask to change the font size by one step', async () => {
    const change = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    expect(change).toHaveBeenCalledWith({ fontSize: expect.any(Number) });
    expect(change.mock.calls[0][0].fontSize).toBeGreaterThan(DEFAULT_READING.fontSize);
  });

  it('when decreasing the zoom, should ask to change only the zoom', async () => {
    const change = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Diminuir o zoom' }));

    expect(change).toHaveBeenCalledWith({ zoom: expect.any(Number) });
  });

  it('when the font is at the maximum, should disable increasing it', () => {
    setup({ ...DEFAULT_READING, fontSize: READING_FONT_SIZE.max });

    expect(screen.getByRole('button', { name: 'Aumentar a letra' })).toBeDisabled();
  });

  it('when the zoom is at the minimum, should disable decreasing it', () => {
    setup({ ...DEFAULT_READING, zoom: READING_ZOOM.min });

    expect(screen.getByRole('button', { name: 'Diminuir o zoom' })).toBeDisabled();
  });

  it('when there is a zoom hint, should show it in the tooltip', async () => {
    setup(DEFAULT_READING, 'Alarga a coluna');

    await userEvent.hover(screen.getByRole('button', { name: 'Aumentar o zoom' }));

    expect(
      await screen.findByText('Alarga a coluna', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });
});
