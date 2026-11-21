import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SuggestInput } from './SuggestInput';

function Controlled({
  suggestions,
  onValueChange,
  disabled,
}: {
  suggestions: string[];
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <SuggestInput
      aria-label="Campo"
      id="campo"
      value={value}
      suggestions={suggestions}
      disabled={disabled}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
}

const optionTexts = async () => (await screen.findAllByRole('option')).map((option) => option.textContent);

describe('SuggestInput', () => {
  it('when clicked, should list the suggestions in the themed popup', async () => {
    render(<Controlled suggestions={['Química', 'Redes']} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(await optionTexts()).toEqual(['Química', 'Redes']);
    expect(document.querySelector('[data-slot="suggest-content"]')).not.toBeNull();
  });

  it('when typing, should keep only the suggestions that match', async () => {
    render(<Controlled suggestions={['Química', 'Redes']} />);

    await userEvent.type(screen.getByRole('combobox'), 'red');

    expect(await optionTexts()).toEqual(['Redes']);
  });

  it('when a suggestion is chosen, should send its text', async () => {
    const onValueChange = vi.fn();
    render(<Controlled suggestions={['Química', 'Redes']} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Redes' }));

    expect(onValueChange).toHaveBeenLastCalledWith('Redes');
  });

  it('when typing a text that is not suggested, should keep the free text', async () => {
    const onValueChange = vi.fn();
    render(<Controlled suggestions={['Química']} onValueChange={onValueChange} />);

    await userEvent.type(screen.getByRole('combobox'), 'Nova');

    expect(onValueChange).toHaveBeenLastCalledWith('Nova');
  });

  it('when there are no suggestions, should behave as a plain input with no popup', async () => {
    render(<Controlled suggestions={[]} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('when disabled, should not open the list', async () => {
    render(<Controlled suggestions={['A']} disabled />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
