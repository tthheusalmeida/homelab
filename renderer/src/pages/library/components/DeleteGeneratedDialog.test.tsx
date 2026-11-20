import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteGeneratedDialog, type GeneratedKind } from './DeleteGeneratedDialog';

function setup(
  kind: GeneratedKind,
  props: Partial<Parameters<typeof DeleteGeneratedDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <DeleteGeneratedDialog
      kind={kind}
      open
      onOpenChange={onOpenChange}
      isPending={false}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onConfirm, onOpenChange };
}

describe('DeleteGeneratedDialog', () => {
  it.each([
    ['mind-map', 'Excluir só o mapa mental?', 'Excluir só o mapa mental'],
    ['infographic', 'Excluir só o infográfico?', 'Excluir só o infográfico'],
  ] as const)(
    'when the kind is %s, should say in the title and in the button that only that one is deleted',
    (kind, title, button) => {
      setup(kind);

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: button })).toBeInTheDocument();
    },
  );

  it('when asking about the mind map, should list what is deleted and what stays', () => {
    setup('mind-map');

    expect(screen.getByText('Será apagado:')).toBeInTheDocument();
    expect(screen.getByText(/O mapa mental deste resumo/)).toBeInTheDocument();
    expect(
      screen.getByText(/O texto do resumo e o infográfico \(se houver\) continuam/),
    ).toBeInTheDocument();
  });

  it('when asking about the infographic, should list what is deleted and what stays', () => {
    setup('infographic');

    expect(screen.getByText(/O infográfico deste resumo/)).toBeInTheDocument();
    expect(
      screen.getByText(/O texto do resumo e o mapa mental \(se houver\) continuam/),
    ).toBeInTheDocument();
  });

  it('when asking, should point to the whole-page deletion for who wants to remove everything', () => {
    setup('mind-map');

    expect(
      screen.getByText(/Para apagar o resumo inteiro, com tudo o que se baseia nele/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sobre o documento/)).toBeInTheDocument();
  });

  it('when asking, should warn that it cannot be undone', () => {
    setup('infographic');

    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('when the mind map was edited, should say the edits are deleted too', () => {
    setup('mind-map', { edited: true });

    expect(screen.getByText(/inclusive todas as edições que você fez nele/)).toBeInTheDocument();
  });

  it('when the infographic is deleted, should never talk about edits', () => {
    setup('infographic', { edited: true });

    expect(screen.queryByText(/edições/)).not.toBeInTheDocument();
  });

  it('when confirming, should call onConfirm once', async () => {
    const { onConfirm } = setup('infographic');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir só o infográfico' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('when pending, should disable the confirm button', () => {
    setup('mind-map', { isPending: true });

    expect(screen.getByRole('button', { name: /Excluir só o mapa mental/ })).toBeDisabled();
  });

  it('when it failed, should show the message', () => {
    setup('mind-map', { errorMessage: 'Não foi possível excluir.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível excluir.');
  });
});
