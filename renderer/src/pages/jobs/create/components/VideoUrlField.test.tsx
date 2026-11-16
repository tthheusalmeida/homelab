import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VideoUrlStrings } from '../video-url-text';
import { VideoUrlField } from './VideoUrlField';

describe('VideoUrlField', () => {
  it("when rendered, should show the friendly notice that downloading from platforms is at the user's own risk", () => {
    render(<VideoUrlField value="" onChange={vi.fn()} />);

    const note = screen.getByRole('note');

    expect(note).toHaveTextContent(VideoUrlStrings.notice);
    expect(note).toHaveTextContent('termos de uso');
    expect(note).toHaveTextContent('assume esse risco');
  });

  it('when rendered, should tell that platform pages and direct files are accepted', () => {
    render(<VideoUrlField value="" onChange={vi.fn()} />);

    expect(screen.getByText(VideoUrlStrings.hint)).toBeInTheDocument();
  });

  it('when the user types a link, should report each change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<VideoUrlField value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('URL do vídeo'), 'h');

    expect(onChange).toHaveBeenCalledWith('h');
  });

  it('when disabled, should lock the input but keep the notice visible', () => {
    render(<VideoUrlField value="https://youtu.be/x" onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('URL do vídeo')).toBeDisabled();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
