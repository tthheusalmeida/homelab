import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChatComposer } from './ChatComposer';
import { ChatList } from './ChatList';

describe('chat layout', () => {
  it('when the conversation list is long, should scroll by itself instead of moving the page', () => {
    render(
      <ChatList
        chats={[]}
        isLoading={false}
        isError={false}
        onSelect={vi.fn()}
        onNew={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('navigation')).toHaveClass('overflow-y-auto', 'min-h-0');
  });

  it('when rendered, should keep the message box out of the scroll (fixed footer) and floating over the page', () => {
    const { container } = render(
      <ChatComposer value="" onChange={vi.fn()} onSend={vi.fn()} settings={null} />,
    );

    expect(container.querySelector('footer')).toHaveClass('shrink-0');
    expect(screen.getByPlaceholderText('Envie uma mensagem...').parentElement).toHaveClass(
      'shadow-lg',
    );
  });
});
