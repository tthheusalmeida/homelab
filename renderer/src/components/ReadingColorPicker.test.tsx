import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  READING_COLOR_NAMES,
  READING_SHADES_LIST,
  type ReadingColorId,
  type ReadingShade,
} from '#shared/contracts/reading';

import { ReadingColorPicker } from './ReadingColorPicker';

const setup = (color: ReadingColorId = 'default', shade: ReadingShade = 50, onChange = vi.fn()) => {
  render(
    <ReadingColorPicker label="Cor de fundo" color={color} shade={shade} onChange={onChange} />,
  );

  return { onChange, user: userEvent.setup() };
};

const colors = () => within(screen.getByRole('radiogroup', { name: 'Cor de fundo' }));
const shades = () => within(screen.getByRole('radiogroup', { name: 'Intensidade: Cor de fundo' }));

describe('ReadingColorPicker', () => {
  it('when shown, should offer the default plus the 22 tailwind colors', () => {
    setup();

    expect(colors().getAllByRole('radio')).toHaveLength(READING_COLOR_NAMES.length + 1);
  });

  it('when a color is selected, should mark only it as checked', () => {
    setup('amber');

    expect(colors().getByRole('radio', { name: 'Âmbar' })).toBeChecked();
    expect(colors().getByRole('radio', { name: 'Padrão' })).not.toBeChecked();
    expect(colors().getByRole('radio', { name: 'Azul' })).not.toBeChecked();
  });

  it('when the default is selected, should mark it and hide the intensity', () => {
    setup('default');

    expect(colors().getByRole('radio', { name: 'Padrão' })).toBeChecked();
    expect(screen.queryByRole('radiogroup', { name: /Intensidade/ })).not.toBeInTheDocument();
  });

  it('when a color is selected, should offer the 11 intensities from 50 to 950 and mark the current one', () => {
    setup('sky', 300);

    expect(shades().getAllByRole('radio')).toHaveLength(READING_SHADES_LIST.length);
    expect(shades().getByRole('radio', { name: '300' })).toBeChecked();
    expect(shades().getByRole('radio', { name: '50' })).not.toBeChecked();
    expect(shades().getByRole('radio', { name: '950' })).not.toBeChecked();
  });

  it('when a color is clicked, should report only the color', async () => {
    const { onChange, user } = setup();

    await user.click(colors().getByRole('radio', { name: 'Verde' }));

    expect(onChange).toHaveBeenCalledWith({ color: 'green' });
  });

  it('when the default is clicked, should report it', async () => {
    const { onChange, user } = setup('rose');

    await user.click(colors().getByRole('radio', { name: 'Padrão' }));

    expect(onChange).toHaveBeenCalledWith({ color: 'default' });
  });

  it('when an intensity is clicked, should report only the intensity', async () => {
    const { onChange, user } = setup('sky', 50);

    await user.click(shades().getByRole('radio', { name: '800' }));

    expect(onChange).toHaveBeenCalledWith({ shade: 800 });
  });

  it('when intensities are shown, should paint each one with that shade of the chosen color', () => {
    setup('red', 50);

    const light = shades().getByRole('radio', { name: '50' });
    const dark = shades().getByRole('radio', { name: '950' });

    expect(light.style.backgroundColor).toContain('oklch');
    expect(light.style.backgroundColor).not.toBe(dark.style.backgroundColor);
  });

  it('when a color is shown, should paint its swatch with the tailwind color', () => {
    setup();

    expect(colors().getByRole('radio', { name: 'Vermelho' }).style.backgroundColor).toContain(
      'oklch',
    );
  });
});
