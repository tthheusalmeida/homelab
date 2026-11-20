import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HexColorPicker, type HexColorOption } from '#components/HexColorPicker';
import { accentOptions } from '#lib/appearance';

const custom: HexColorOption[] = [
  { id: 'a', label: 'Alfa', color: '#ff0000' },
  { id: 'b', label: 'Beta', color: '#00ff00' },
];

describe('HexColorPicker', () => {
  it('when rendered with the theme colors, should offer the 15 accent options', () => {
    render(<HexColorPicker label="Cor" options={accentOptions} value="blue" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: 'Cor' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(15);
  });

  it('when a value is set, should mark only that option', () => {
    render(<HexColorPicker label="Cor" options={accentOptions} value="rose" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Rosé' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'false');
  });

  it('when the value is undefined, should leave every option unmarked', () => {
    render(
      <HexColorPicker label="Cor" options={accentOptions} value={undefined} onChange={() => {}} />,
    );

    expect(
      screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
  });

  it('when an option is clicked, should call onChange with its id', async () => {
    const onChange = vi.fn();
    render(<HexColorPicker label="Cor" options={accentOptions} value="blue" onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Verde' }));

    expect(onChange).toHaveBeenCalledWith('green');
  });

  it('when the options are theme accents, should tag each hexagon with its accent', () => {
    render(<HexColorPicker label="Cor" options={accentOptions} value="blue" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Violeta' })).toHaveAttribute('data-accent', 'violet');
  });

  it('when the options carry a css color, should paint the hexagon with it', () => {
    render(<HexColorPicker label="Cor" options={custom} value="a" onChange={() => {}} />);

    const fill = screen.getByRole('radio', { name: 'Alfa' }).querySelector('span:last-child');

    expect(fill).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('when disabled, should not call onChange', async () => {
    const onChange = vi.fn();
    render(<HexColorPicker label="Cor" options={custom} value="a" onChange={onChange} disabled />);

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Beta' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
