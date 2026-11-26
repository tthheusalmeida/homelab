import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FloatingToolbar, ToolbarSeparator, ZoomButtons } from './FloatingToolbar';

describe('FloatingToolbar', () => {
  it('when placed absolute, should float centered at the bottom of its area', () => {
    render(
      <FloatingToolbar label="Controles do mapa">
        <button type="button">Ação</button>
      </FloatingToolbar>,
    );

    const bar = screen.getByRole('toolbar', { name: 'Controles do mapa' });

    expect(bar).toHaveAttribute('data-placement', 'absolute');
    expect(bar.className).toContain('absolute');
    expect(bar.className).toContain('left-1/2');
  });

  it('when inside the reading mode, should keep the app font instead of the reading font', () => {
    render(
      <FloatingToolbar label="Controles">
        <button type="button">Ação</button>
      </FloatingToolbar>,
    );

    expect(screen.getByRole('toolbar')).toHaveClass('font-sans');
  });

  it('when placed sticky, should stick to the bottom of the scrolling area', () => {
    render(
      <FloatingToolbar label="Controles" placement="sticky">
        <ToolbarSeparator />
      </FloatingToolbar>,
    );

    expect(screen.getByRole('toolbar').className).toContain('sticky');
  });

  it('when placed in either way, should read its height from the shared variable (20 px from the window)', () => {
    const { rerender } = render(
      <FloatingToolbar label='Controles'>
        <ToolbarSeparator />
      </FloatingToolbar>,
    );

    expect(screen.getByRole('toolbar').className).toContain('bottom-[var(--floating-toolbar-bottom,0.25rem)]');

    rerender(
      <FloatingToolbar label='Controles' placement='sticky'>
        <ToolbarSeparator />
      </FloatingToolbar>,
    );

    expect(screen.getByRole('toolbar').className).toContain('bottom-[var(--floating-toolbar-bottom,1.25rem)]');
  });

  it('when the pointer goes down on it, should not reach the area below', () => {
    const below = vi.fn();

    render(
      <div onPointerDown={below}>
        <FloatingToolbar label="Controles">
          <button type="button">Ação</button>
        </FloatingToolbar>
      </div>,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ação' }));

    expect(below).not.toHaveBeenCalled();
  });
});

describe('ZoomButtons', () => {
  it('when clicking, should call decrease and increase and show the percentage', async () => {
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();

    render(
      <ZoomButtons
        percent={120}
        decreaseLabel="Diminuir o zoom"
        increaseLabel="Aumentar o zoom"
        sizeLabel="Tamanho"
        canDecrease
        canIncrease
        onDecrease={onDecrease}
        onIncrease={onIncrease}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Diminuir o zoom' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar o zoom' }));

    expect(onDecrease).toHaveBeenCalledOnce();
    expect(onIncrease).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Tamanho')).toHaveTextContent('120%');
  });

  it('when at a limit, should disable that button', () => {
    render(
      <ZoomButtons
        percent={200}
        decreaseLabel="Diminuir"
        increaseLabel="Aumentar"
        sizeLabel="Tamanho"
        canDecrease
        canIncrease={false}
        onDecrease={() => undefined}
        onIncrease={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled();
  });
});
