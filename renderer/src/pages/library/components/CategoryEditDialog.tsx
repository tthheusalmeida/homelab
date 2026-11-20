import { useEffect, useId, useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';
import { Input } from '#ui/input';
import { Label } from '#ui/label';

import { Callout } from '#components/Callout';
import { OptionSelect } from '#components/OptionSelect';
import { useSnackbar } from '#components/Snackbar';

import { findCategory, placesFor, startsWithPath } from '../categories';
import { useRenameCategory } from '../hooks/useLibrary';
import type { CategoryNode } from '../types/library.types';

/** Tamanho máximo do nome de uma categoria (o mesmo do back). */
const MAX_NAME_LENGTH = 60;
/** Valor da lista para o nível principal (uma lista não aceita valor vazio). */
const ROOT = 'root';

export const CategoryEditStrings = {
  title: 'Editar categoria',
  description: (count: number) =>
    `Mude o nome ou o lugar desta categoria. As ${count === 1 ? '1 página' : `${count} páginas`} dela (e as das subcategorias) vão junto para a nova pasta; as subcategorias continuam dentro dela.`,
  name: 'Nome',
  parent: 'Dentro de',
  parentPlaceholder: 'Escolha onde ela fica',
  root: 'Nenhuma (nível principal)',
  merge: 'Já existe uma categoria com esse nome nesse lugar: as páginas vão se juntar a ela.',
  save: 'Salvar',
  saving: 'Movendo as páginas…',
  cancel: 'Cancelar',
  failed: 'Não foi possível mudar a categoria. Tente novamente.',
  done: (moved: number) =>
    moved === 0
      ? 'Nada mudou.'
      : `${moved === 1 ? '1 página movida' : `${moved} páginas movidas`} para a nova categoria.`,
} as const;

interface CategoryEditDialogProps {
  /** Categoria a editar; `null` mantém o diálogo fechado. */
  category: CategoryNode | null;
  /** A árvore inteira (os lugares possíveis e o aviso de que o nome já existe ali). */
  tree: CategoryNode[];
  onOpenChange: (open: boolean) => void;
  /** Depois de salvar: o caminho de antes e o novo (a tela acompanha o filtro, se for o caso). */
  onRenamed?: (from: string[], to: string[]) => void;
}

/**
 * Editar uma categoria depois de criada, sem refazer o caminho: **Nome** (um campo de texto) e
 * **Dentro de** (a lista dos lugares onde ela pode ficar). As páginas dela, e as das subcategorias,
 * vão para a pasta nova, e as subcategorias seguem dentro dela. Se já existe uma categoria com esse
 * nome nesse lugar, elas se juntam a ela. Mover arrastando na árvore faz a mesma coisa.
 */
export function CategoryEditDialog({
  category,
  tree,
  onOpenChange,
  onRenamed,
}: CategoryEditDialogProps) {
  // Enquanto as páginas se mexem, o diálogo não fecha (Esc, clique fora ou X): fechar no meio faria
  // a operação continuar sem nenhum sinal na tela.
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={category !== null} onOpenChange={(open) => (open || !busy) && onOpenChange(open)}>
      <DialogContent bare className="sm:max-w-md">
        {category && (
          <CategoryEditForm
            key={category.path.join('\u0000')}
            category={category}
            tree={tree}
            onDone={() => onOpenChange(false)}
            onBusyChange={setBusy}
            onRenamed={onRenamed}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CategoryEditFormProps {
  category: CategoryNode;
  tree: CategoryNode[];
  onDone: () => void;
  /** Avisa o diálogo de que as páginas estão sendo movidas (ele não pode fechar nesse tempo). */
  onBusyChange: (busy: boolean) => void;
  onRenamed?: (from: string[], to: string[]) => void;
}

function CategoryEditForm({
  category,
  tree,
  onDone,
  onBusyChange,
  onRenamed,
}: CategoryEditFormProps) {
  const nameId = useId();
  const currentParent = category.path.slice(0, -1);
  const [name, setName] = useState(category.name);
  const [parent, setParent] = useState(currentParent);
  const rename = useRenameCategory();
  const snackbar = useSnackbar();

  useEffect(() => {
    onBusyChange(rename.isPending);

    // se o formulário sair da tela, o diálogo volta a poder fechar
    return () => onBusyChange(false);
  }, [rename.isPending, onBusyChange]);

  const places = useMemo(
    () => placesFor(category, tree, CategoryEditStrings.root),
    [category, tree],
  );
  const options = places.map((place) => ({
    id: place.path.length === 0 ? ROOT : place.path.join('\u0000'),
    label: place.label,
  }));
  const parentId = parent.length === 0 ? ROOT : parent.join('\u0000');

  const cleanName = name.trim();
  const target = [...parent, cleanName];
  const unchanged =
    cleanName === category.name &&
    parent.length === currentParent.length &&
    startsWithPath(parent, currentParent);
  const sameSpot = target.length === category.path.length && startsWithPath(target, category.path);
  const merging = cleanName !== '' && !sameSpot && findCategory(tree, target) !== undefined;
  const canSave = cleanName !== '' && !unchanged && !rename.isPending;

  function chooseParent(id: string | null) {
    const place = places.find((own, index) => options[index].id === id);

    if (place) {
      setParent(place.path);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    rename.mutate(
      { from: category.path, to: target },
      {
        onSuccess: ({ moved }) => {
          snackbar.success(CategoryEditStrings.done(moved));
          onRenamed?.(category.path, target);
          onDone();
        },
      },
    );
  }

  return (
    <DialogForm onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{CategoryEditStrings.title}</DialogTitle>

        <DialogDescription>{CategoryEditStrings.description(category.count)}</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor={nameId}>{CategoryEditStrings.name}</Label>

        <Input
          id={nameId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          disabled={rename.isPending}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>{CategoryEditStrings.parent}</Label>

        <OptionSelect
          value={parentId}
          options={options}
          placeholder={CategoryEditStrings.parentPlaceholder}
          label={CategoryEditStrings.parent}
          triggerWidth="w-full"
          contentWidth="w-72"
          disabled={rename.isPending}
          onValueChange={chooseParent}
        />
      </div>

      {merging && <Callout tone="info">{CategoryEditStrings.merge}</Callout>}

      {rename.isError && (
        <p role="alert" className="text-sm text-destructive">
          {rename.error.message || CategoryEditStrings.failed}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={rename.isPending} onClick={onDone}>
          {CategoryEditStrings.cancel}
        </Button>

        <Button type="submit" disabled={!canSave}>
          {rename.isPending && <Loader2 className="animate-spin" />}
          {rename.isPending ? CategoryEditStrings.saving : CategoryEditStrings.save}
        </Button>
      </DialogFooter>
    </DialogForm>
  );
}
