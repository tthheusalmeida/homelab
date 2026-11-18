import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useLinksField } from '../hooks/useLinksField';
import { VideoUrlStrings } from '../video-url-text';
import { VideoUrlField } from './VideoUrlField';

function Harness({ disabled }: { disabled?: boolean }) {
  const field = useLinksField();

  return <VideoUrlField field={field} disabled={disabled} />;
}

const input = () => screen.getByLabelText('Links dos vídeos');

describe('VideoUrlField', () => {
  it("when rendered, should show the friendly notice that downloading from platforms is at the user's own risk", () => {
    render(<Harness />);

    const note = screen.getByRole('note');

    expect(note).toHaveTextContent(VideoUrlStrings.notice);
    expect(note).toHaveTextContent('termos de uso');
    expect(note).toHaveTextContent('assume esse risco');
  });

  it('when rendered, should tell that platform pages and direct files are accepted and that each link is a task', () => {
    render(<Harness />);

    expect(screen.getByText(VideoUrlStrings.hint)).toBeInTheDocument();
    expect(VideoUrlStrings.hint).toContain('Cada link colado vira uma tarefa');
  });

  it('when a link is pasted, should put it in the list at once and clear the field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    await user.paste('https://www.youtube.com/watch?v=abc');

    expect(screen.getByRole('list', { name: 'Links adicionados' })).toHaveTextContent('youtube.com');
    expect(input()).toHaveValue('');
  });

  it('when several links are pasted together, should add each one as its own row', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    await user.paste('https://a.com/1\nhttps://b.com/2\nhttps://c.com/3');

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('when a link is typed and Enter is pressed, should add it to the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), 'https://a.com/1{Enter}');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(input()).toHaveValue('');
  });

  it('when a link is typed and Adicionar is clicked, should add it to the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), 'https://a.com/1');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('when the field is empty, should keep Adicionar disabled', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
  });

  it('when the text is not a link, should show the error and not add it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), 'banana{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('http:// ou https://');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it('when a link already in the list is added again, should say it is repeated', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), 'https://a.com/1{Enter}');
    await user.type(input(), 'https://a.com/1{Enter}');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Esse link já está na lista.');
  });

  it('when Edit is clicked on a row, should move that link back to the field and focus it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(input());
    await user.paste('https://a.com/1 https://b.com/2');

    await user.click(screen.getByRole('button', { name: 'Editar link 1' }));

    expect(input()).toHaveValue('https://a.com/1');
    expect(input()).toHaveFocus();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('when Remove is clicked on a row, should drop only that link', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(input());
    await user.paste('https://a.com/1 https://b.com/2');

    await user.click(screen.getByRole('button', { name: 'Remover link 1' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('list')).toHaveTextContent('b.com');
  });

  it('when disabled, should lock the input and the buttons but keep the notice visible', async () => {
    render(<Harness disabled />);

    expect(input()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
