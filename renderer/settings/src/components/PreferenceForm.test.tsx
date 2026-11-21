import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen } from '@testing-library/react';
import { renderWithSnackbar as render } from '#test/utils';
import userEvent from '@testing-library/user-event';

import { CheckboxField } from './CheckboxField';
import { PreferenceError, RestoreButton, usePreferenceAction } from './PreferenceForm';

describe('CheckboxField', () => {
  it('when clicked, should send the new value', async () => {
    const onChange = vi.fn();
    render(<CheckboxField id="x" label="Ligar" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Ligar'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('when the label is clicked, should toggle the box too', async () => {
    const onChange = vi.fn();
    render(<CheckboxField id="x" label="Ligar" checked onChange={onChange} />);

    await userEvent.click(screen.getByText('Ligar'));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('when disabled, should not change', async () => {
    const onChange = vi.fn();
    render(<CheckboxField id="x" label="Ligar" checked={false} disabled onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Ligar'));

    expect(screen.getByLabelText('Ligar')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RestoreButton', () => {
  it('when enabled and clicked, should call onClick', async () => {
    const onClick = vi.fn();
    render(
      <RestoreButton disabled={false} onClick={onClick}>
        Restaurar
      </RestoreButton>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Restaurar/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('when everything is already default, should be disabled', () => {
    render(
      <RestoreButton disabled onClick={vi.fn()}>
        Restaurar
      </RestoreButton>,
    );

    expect(screen.getByRole('button', { name: /Restaurar/ })).toBeDisabled();
  });
});

describe('PreferenceError', () => {
  it('when there is a message, should show it as an alert', () => {
    render(<PreferenceError message="Falhou" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });

  it('when the message is null, should render nothing', () => {
    render(<PreferenceError message={null} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('usePreferenceAction', () => {
  it('when the action fails, should keep the error message', async () => {
    const { result } = renderHook(() => usePreferenceAction());

    await act(async () => {
      result.current.run(Promise.reject(new Error('sem espaço')));
      await Promise.resolve();
    });

    expect(result.current.error).toBe('sem espaço');
  });

  it('when a new action starts, should clear the previous error', async () => {
    const { result } = renderHook(() => usePreferenceAction());

    await act(async () => {
      result.current.run(Promise.reject(new Error('x')));
      await Promise.resolve();
    });
    await act(async () => {
      result.current.run(Promise.resolve());
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
  });
});
