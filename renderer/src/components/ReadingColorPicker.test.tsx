import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { READING_COLOR_NAMES } from '#shared/contracts/reading';

import { ReadingColorPicker } from './ReadingColorPicker';

describe('ReadingColorPicker', () => {
  it('when shown, should offer the default plus the 22 tailwind colors', () => {
    render(<ReadingColorPicker label="Cor de fundo" value="default" onChange={() => {}} />);

    expect(screen.getAllByRole('radio')).toHaveLength(READING_COLOR_NAMES.length + 1);
    expect(screen.getByRole('radiogroup', { name: 'Cor de fundo' })).toBeInTheDocument();
  });

  it('when a color is selected, should mark only it as checked', () => {
    render(<ReadingColorPicker label="Cor" value="amber" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Âmbar' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Padrão' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Azul' })).not.toBeChecked();
  });

  it('when the default is selected, should mark it as checked', () => {
    render(<ReadingColorPicker label="Cor" value="default" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Padrão' })).toBeChecked();
  });

  it('when a color is clicked, should report its id without any shade', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReadingColorPicker label="Cor" value="default" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Verde' }));

    expect(onChange).toHaveBeenCalledWith('green');
  });

  it('when the default is clicked, should report it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReadingColorPicker label="Cor" value="rose" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Padrão' }));

    expect(onChange).toHaveBeenCalledWith('default');
  });

  it('when a color is shown, should paint its swatch with the tailwind color', () => {
    render(<ReadingColorPicker label="Cor" value="default" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Vermelho' }).style.backgroundColor).toContain(
      'oklch',
    );
  });
});
