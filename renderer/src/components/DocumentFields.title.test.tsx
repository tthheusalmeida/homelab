import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DocumentFields } from './DocumentFields';

const base = {
  idPrefix: 'doc',
  title: '',
  onTitleChange: () => {},
  category: [],
  onCategoryChange: () => {},
  categoryOptions: [],
  tags: [],
  onTagsChange: () => {},
};

describe('DocumentFields title lock', () => {
  it('when a reason to lock the title is given, should disable only the title and show the reason', () => {
    render(<DocumentFields {...base} titleDisabledReason="Vários links" />);

    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByText('Vários links')).toBeInTheDocument();
    expect(screen.getByLabelText('Adicionar tag')).toBeEnabled();
  });

  it('when no reason is given, should keep the title enabled', () => {
    render(<DocumentFields {...base} />);

    expect(screen.getByLabelText('Título')).toBeEnabled();
  });

  it('when everything is disabled, should disable the title even without a reason', () => {
    render(<DocumentFields {...base} disabled />);

    expect(screen.getByLabelText('Título')).toBeDisabled();
  });
});
