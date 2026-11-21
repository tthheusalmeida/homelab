import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { Sidebar, SidebarProvider, SidebarTrigger } from './sidebar';

const renderSidebar = (peek: boolean, defaultOpen = false) =>
  render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar peek={peek}>
        <p>Menu</p>
      </Sidebar>

      <SidebarTrigger />
    </SidebarProvider>,
  );

const zone = () => document.querySelector('[data-slot="sidebar-peek-zone"]');
const container = () => document.querySelector('[data-slot="sidebar-container"]')!;

describe('Sidebar peek', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('when collapsed with peek on, should offer an edge zone and keep the bar hidden', () => {
    renderSidebar(true);

    expect(zone()).toBeInTheDocument();
    expect(container()).not.toHaveAttribute('data-peek');
  });

  it('when the mouse reaches the edge zone, should show the bar over the content', () => {
    renderSidebar(true);

    fireEvent.mouseEnter(zone()!);

    expect(container()).toHaveAttribute('data-peek', 'true');
    expect(zone()).not.toBeInTheDocument();
  });

  it('when the mouse leaves the bar, should retract it after a short delay', () => {
    renderSidebar(true);
    fireEvent.mouseEnter(zone()!);

    fireEvent.mouseLeave(container());

    expect(container()).toHaveAttribute('data-peek', 'true');

    act(() => void vi.advanceTimersByTime(400));

    expect(container()).not.toHaveAttribute('data-peek');
    expect(zone()).toBeInTheDocument();
  });

  it('when the mouse comes back before the delay ends, should keep the bar open', () => {
    renderSidebar(true);
    fireEvent.mouseEnter(zone()!);

    fireEvent.mouseLeave(container());
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.mouseEnter(container());
    act(() => void vi.advanceTimersByTime(1000));

    expect(container()).toHaveAttribute('data-peek', 'true');
  });

  it('when peek is off, should not render the edge zone', () => {
    renderSidebar(false);

    expect(zone()).not.toBeInTheDocument();
  });

  it('when the bar is expanded, should not render the edge zone', () => {
    renderSidebar(true, true);

    expect(zone()).not.toBeInTheDocument();
  });

  it('when the bar is expanded while peeking, should leave the peek state', () => {
    renderSidebar(true);
    fireEvent.mouseEnter(zone()!);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));

    expect(container()).not.toHaveAttribute('data-peek');
    expect(zone()).not.toBeInTheDocument();
  });
});
