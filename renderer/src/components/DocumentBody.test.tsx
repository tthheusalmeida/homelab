import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DocumentBody } from './DocumentBody';

const timed = '[00:00:05] Primeiro trecho falado.\n\n[00:01:10] Segundo trecho falado.';

describe('DocumentBody', () => {
  it('when a transcription has times, should render it as a timed transcript', () => {
    render(<DocumentBody content={timed} isTranscription />);

    expect(document.querySelector('[data-slot="transcript"]')).not.toBeNull();
    expect(screen.getAllByText('Primeiro trecho falado.').length).toBeGreaterThan(0);
  });

  it('when the document is not a transcription, should render it as Markdown', () => {
    render(<DocumentBody content={'# Título\n\nTexto.'} isTranscription={false} />);

    expect(document.querySelector('[data-slot="transcript"]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument();
  });

  it('when a transcription has no times (old document), should keep it as plain text', () => {
    render(<DocumentBody content="Texto corrido sem tempo." isTranscription />);

    expect(document.querySelector('[data-slot="transcript"]')).toBeNull();
    expect(screen.getByText('Texto corrido sem tempo.')).toBeInTheDocument();
  });

  it('when compact, should show only the time and the paragraph, with no rail, progress or hover', () => {
    render(<DocumentBody content={timed} isTranscription compact />);

    expect(document.querySelector('[data-slot="transcript-rail"]')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(document.querySelector('[data-excerpt]')?.className).not.toContain('hover:bg-');
    expect(screen.getByText('0:05')).toBeInTheDocument();
    expect(screen.getByText('Segundo trecho falado.')).toBeInTheDocument();
  });
});
