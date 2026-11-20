import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProviderActions, ProviderFeedback, ProvidersGate, testResultOf } from './ProviderParts';

const query = (state: object) => state as never;

describe('ProvidersGate', () => {
  it('when loading, should show the loading state and not the content', () => {
    render(<ProvidersGate query={query({ isPending: true, isError: false })}>{() => <p>dados</p>}</ProvidersGate>);

    expect(screen.queryByText('dados')).toBeNull();
    expect(screen.getAllByText('Carregando').length).toBeGreaterThan(0);
  });

  it('when it failed, should show the error and retry on the button', async () => {
    const refetch = vi.fn();
    render(
      <ProvidersGate query={query({ isPending: false, isError: true, error: new Error('caiu'), refetch })}>
        {() => <p>dados</p>}
      </ProvidersGate>,
    );

    expect(screen.getByText('caiu')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('when loaded, should hand the data to the content', () => {
    render(
      <ProvidersGate query={query({ isPending: false, isError: false, data: ['a', 'b'] })}>
        {(data: string[]) => <p>{data.join('+')}</p>}
      </ProvidersGate>,
    );

    expect(screen.getByText('a+b')).toBeInTheDocument();
  });
});

describe('ProviderActions', () => {
  const props = { testing: false, onTest: vi.fn(), saving: false, onSave: vi.fn() };

  it('when the provider is not editable, should offer only the test button', () => {
    render(<ProviderActions {...props} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('when editable but nothing changed, should show save disabled', () => {
    render(<ProviderActions {...props} saveDisabled />);

    expect(screen.getAllByRole('button')[1]).toBeDisabled();
  });

  it('when editable and changed, should call save and test on their buttons', async () => {
    const onTest = vi.fn();
    const onSave = vi.fn();
    render(<ProviderActions {...props} onTest={onTest} onSave={onSave} saveDisabled={false} />);

    const [test, save] = screen.getAllByRole('button');

    await userEvent.click(test);
    await userEvent.click(save);

    expect(onTest).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('when testing or saving, should disable the button that is working', () => {
    render(<ProviderActions {...props} testing saving saveDisabled={false} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});

describe('ProviderFeedback', () => {
  it('when saving failed, should show the error as an alert', () => {
    render(<ProviderFeedback testResult={null} saveError="Sem permissão" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão');
  });

  it('when there is no error, should show no alert', () => {
    render(<ProviderFeedback testResult={null} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('testResultOf', () => {
  it('when the test returned data, should use it', () => {
    expect(testResultOf({ data: { ok: true, message: 'ok' }, isError: false, error: null })).toEqual({
      ok: true,
      message: 'ok',
    });
  });

  it('when the test threw, should turn the error into a failed result', () => {
    expect(testResultOf({ isError: true, error: new Error('x') })).toEqual({ ok: false, message: 'x' });
  });

  it('when the test has not run, should be null', () => {
    expect(testResultOf({ isError: false, error: null })).toBeNull();
  });
});
