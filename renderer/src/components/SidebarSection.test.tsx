import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SidebarProvider } from '#ui/sidebar';

import { SidebarSection } from './SidebarSection';

const renderSection = (props: Partial<React.ComponentProps<typeof SidebarSection>> = {}) =>
  render(
    <SidebarProvider>
      <SidebarSection label="Sistema" open onToggle={vi.fn()} {...props}>
        <p>itens</p>
      </SidebarSection>
    </SidebarProvider>,
  );

describe('SidebarSection', () => {
  it('when open, should show the label and its items', () => {
    renderSection();

    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByText('itens')).toBeInTheDocument();
  });

  it('when the label is clicked, should ask to toggle the section', async () => {
    const onToggle = vi.fn();

    renderSection({ onToggle });
    await userEvent.click(screen.getByText('Sistema'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('when collapsed with the current page inside, should show the highlight dot', () => {
    renderSection({ open: false, hasActive: true });

    expect(screen.getByLabelText('Página atual em Sistema')).toBeInTheDocument();
  });

  it('when collapsed without the current page, should not show the dot', () => {
    renderSection({ open: false, hasActive: false });

    expect(screen.queryByLabelText('Página atual em Sistema')).not.toBeInTheDocument();
  });

  it('when open, should not show the dot even with the current page inside', () => {
    renderSection({ open: true, hasActive: true });

    expect(screen.queryByLabelText('Página atual em Sistema')).not.toBeInTheDocument();
  });

  it('when an accessible label is given, should use it for the dot', () => {
    renderSection({ open: false, hasActive: true, activeLabel: 'Seção atual em Sistema' });

    expect(screen.getByLabelText('Seção atual em Sistema')).toBeInTheDocument();
  });
});
