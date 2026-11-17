import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { READING_SHADES_LIST } from '#shared/contracts/reading';

import { ShadeSlider } from './ShadeSlider';

const setup = (value: 50 | 300 | 950 = 300, onChange = vi.fn()) => {
  render(
    <ShadeSlider label="Intensidade: Cor de fundo" color="sky" value={value} onChange={onChange} />,
  );

  return { onChange, slider: screen.getByRole('slider', { name: 'Intensidade: Cor de fundo' }) };
};

describe('ShadeSlider', () => {
  it('when shown, should be a slider with one step per tailwind intensity', () => {
    const { slider } = setup();

    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', String(READING_SHADES_LIST.length - 1));
    expect(slider).toHaveAttribute('step', '1');
  });

  it('when the intensity is 300, should place the slider on its step and say the intensity', () => {
    const { slider } = setup(300);

    expect(slider).toHaveValue(String(READING_SHADES_LIST.indexOf(300)));
    expect(slider).toHaveAttribute('aria-valuetext', '300');
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('when moved, should report the intensity of the new step', () => {
    const { slider, onChange } = setup(300);

    fireEvent.change(slider, { target: { value: String(READING_SHADES_LIST.indexOf(800)) } });

    expect(onChange).toHaveBeenCalledWith(800);
  });

  it('when moved to the ends, should reach the lightest (50) and the darkest (950)', () => {
    const { slider, onChange } = setup(300);

    fireEvent.change(slider, { target: { value: '0' } });
    fireEvent.change(slider, { target: { value: '10' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 50);
    expect(onChange).toHaveBeenNthCalledWith(2, 950);
  });

  it('when shown, should label the ends as lighter and darker', () => {
    setup();

    expect(screen.getByText('Clara')).toBeInTheDocument();
    expect(screen.getByText('Escura')).toBeInTheDocument();
  });

  it('when shown, should paint the track with the bands of the chosen color', () => {
    const { slider } = setup();

    const bands = slider.style.getPropertyValue('--shade-bands');

    expect(bands).toContain('linear-gradient');
    expect(bands.match(/oklch\(/g)).toHaveLength(READING_SHADES_LIST.length);
  });
});
