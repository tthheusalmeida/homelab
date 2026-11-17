import { fireEvent, render, screen, within } from '@testing-library/react';
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

/** O preenchimento hexagonal é o último elemento dentro do botão. */
const fillOf = (swatch: HTMLElement) => swatch.lastElementChild as HTMLElement;
const colors = () => within(screen.getByRole('radiogroup', { name: 'Cor de fundo' }));
const slider = () => screen.getByRole('slider', { name: 'Intensidade: Cor de fundo' });

describe('ReadingColorPicker', () => {
  it('when shown, should offer the default plus the 15 tailwind colors', () => {
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

  it('when a color is selected, should offer the intensity as a slider on the current step', () => {
    setup('sky', 300);

    expect(slider()).toHaveValue(String(READING_SHADES_LIST.indexOf(300)));
    expect(slider()).toHaveAttribute('aria-valuetext', '300');
    expect(screen.queryByRole('radiogroup', { name: /Intensidade/ })).not.toBeInTheDocument();
  });

  it('when the default is selected, should not offer the slider', () => {
    setup('default');

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
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

  it('when the slider moves, should report only the intensity', () => {
    const { onChange } = setup('sky', 50);

    fireEvent.change(slider(), { target: { value: String(READING_SHADES_LIST.indexOf(800)) } });

    expect(onChange).toHaveBeenCalledWith({ shade: 800 });
  });

  it('when a color is shown, should paint its swatch with the tailwind color', () => {
    setup();

    expect(
      fillOf(colors().getByRole('radio', { name: 'Vermelho' })).style.backgroundColor,
    ).toContain('oklch');
  });

  it('when listing colors, should draw every one as a hexagon', () => {
    setup('sky', 300);

    const swatches = document.querySelectorAll('[data-slot=hex-swatch]');

    expect(swatches).toHaveLength(READING_COLOR_NAMES.length + 1);
    for (const swatch of swatches) {
      expect((swatch.lastElementChild as HTMLElement).className).toContain(
        'clip-path:polygon(50%_0',
      );
    }
  });
});
