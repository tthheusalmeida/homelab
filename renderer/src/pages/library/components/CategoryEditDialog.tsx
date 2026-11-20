import { useEffect, useState } from 'react';

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

import { Callout } from '#components/Callout';
import { CategoryPicker } from '#components/CategoryPicker';
import { useSnackbar } from '#components/Snackbar';
import { normalizeKey } from '#lib/text';

import { useRenameCategory } from '../hooks/useLibrary';
import type { CategoryNode } from '../types/library.types';

/** Máximo de níveis de uma categoria (pastas dentro de pastas). */
const MAX_LEVELS = 4;

export const CategoryEditStrings = {
  title: 'Editar categoria',
  description: (count: number) =>
    `Mude o nome ou o lugar desta categoria. As ${count === 1 ? '1 página' : `${count} páginas`} dela (e as das subcategorias) vão junto para a nova pasta.`,
  merge: 'Já existe uma categoria com esse caminho: as páginas vão se juntar a ela.',
  tooDeep: `Com esse caminho, alguma subcategoria passaria de ${MAX_LEVELS} níveis. Use um caminho mais curto.`,
  save: 'Salvar',
  saving: 'Movendo as páginas…',
  cancel: 'Cancelar',
  failed: 'Não foi possível mudar a categoria. Tente novamente.',
  done: (moved: number) =>
    moved === 0
      ? 'Nada mudou.'
      : `${moved === 1 ? '1 página movida' : `${moved} páginas movidas`} para a nova categoria.`,
} as const;

const samePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((name, level) => name === b[level]);

const sameKeys = (a: string[], b: string[]) =>
  a.length === b.length && a.every((name, level) => normalizeKey(name) === normalizeKey(b[level]));

function findNode(nodes: CategoryNode[], path: string[]): CategoryNode | undefined {
  let level = nodes;
  let found: CategoryNode | undefined;

  for (const name of path) {
    found = level.find((node) => normalizeKey(node.name) === normalizeKey(name));

    if (!found) {
      return undefined;
    }

    level = found.children;
  }

  return found;
}

/** Quantos níveis a categoria tem, contando a subcategoria mais funda dela. */
function depthOf(node: CategoryNode): number {
  return 1 + Math.max(0, ...node.children.map(depthOf));
}

interface CategoryEditDialogProps {
  /** Categoria a editar; `null` mantém o diálogo fechado. */
  category: CategoryNode | null;
  /** A árvore inteira (sugestões em cada nível e aviso de que o caminho já existe). */
  tree: CategoryNode[];
  onOpenChange: (open: boolean) => void;
  /** Depois de salvar: o caminho de antes e o novo (a tela acompanha o filtro, se for o caso). */
  onRenamed?: (from: string[], to: string[]) => void;
}

/**
 * Editar uma categoria depois de criada: trocar o nome ou mudar de lugar (inclusive para dentro de
 * outra). As páginas dela, e as das subcategorias, vão para a pasta nova; se o caminho novo já existe,
 * elas se juntam a ele.
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
      <DialogContent bare className="sm:max-w-xl">
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
  const [path, setPath] = useState(category.path);
  const rename = useRenameCategory();
  const snackbar = useSnackbar();

  useEffect(() => {
    onBusyChange(rename.isPending);

    // se o formulário sair da tela, o diálogo volta a poder fechar
    return () => onBusyChange(false);
  }, [rename.isPending, onBusyChange]);

  // O seletor já tira os níveis vazios do fim; um nível só de espaços não vale.
  const target = path.map((name) => name.trim());
  const valid = target.length > 0 && target.every((name) => name !== '');
  const unchanged = samePath(target, category.path);
  const deepest = target.length + depthOf(category) - category.path.length;
  const tooDeep = valid && deepest > MAX_LEVELS;
  const merging = valid && findNode(tree, target) !== undefined && !sameKeys(target, category.path);
  const canSave = valid && !unchanged && !tooDeep && !rename.isPending;

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

      <CategoryPicker
        value={path}
        onChange={setPath}
        options={tree}
        maxLevels={MAX_LEVELS}
        disabled={rename.isPending}
      />

      {merging && <Callout tone="info">{CategoryEditStrings.merge}</Callout>}

      {tooDeep && <Callout tone="warning">{CategoryEditStrings.tooDeep}</Callout>}

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
