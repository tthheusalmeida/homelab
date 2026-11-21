import { useId, useMemo, useState } from 'react';

import {
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';
import { Input } from '#ui/input';
import { Label } from '#ui/label';

import { BusyDialog, useReportBusy } from '#components/BusyDialog';
import { Callout } from '#components/Callout';
import { FormButtons } from '#components/FormButtons';
import { OptionSelect } from '#components/OptionSelect';
import { useSnackbar } from '#components/Snackbar';

import { findCategory, MAX_CATEGORY_LEVELS, parseCategoryNames, placesForNew } from '../categories';
import { useCreateCategory } from '../hooks/useLibrary';
import type { CategoryNode } from '../types/library.types';

/** Tamanho máximo do nome de um nível (o mesmo do back). */
const MAX_NAME_LENGTH = 60;
/** Valor da lista para o nível principal (uma lista não aceita valor vazio). */
const ROOT = 'root';

export const CategoryCreateStrings = {
  title: 'Nova categoria',
  description:
    'Crie uma categoria vazia onde quiser. Para criar vários níveis de uma vez, separe os nomes com “/”: os níveis de cima ficam vazios até você pôr páginas neles.',
  name: 'Nome',
  namePlaceholder: 'Ex.: Redes / Segurança / Firewall',
  parent: 'Dentro de',
  root: 'Nenhuma (nível principal)',
  exists: 'Já existe uma categoria com esse caminho.',
  tooDeep: `Com esse nome a categoria passaria de ${MAX_CATEGORY_LEVELS} níveis. Escolha outro lugar ou um nome mais curto.`,
  willCreate: (levels: number) => `Vão ser criados ${levels} níveis; os de cima ficam vazios.`,
  willBeIn: 'Ficará em:',
  create: 'Criar',
  creating: 'Criando…',
  cancel: 'Cancelar',
  failed: 'Não foi possível criar a categoria. Tente novamente.',
  done: 'Categoria criada.',
} as const;

interface CategoryCreateDialogProps {
  /** Onde criar: `[]` é o nível principal; `null` mantém o diálogo fechado. */
  parent: string[] | null;
  /** A árvore inteira (os lugares possíveis e o aviso de que o caminho já existe). */
  tree: CategoryNode[];
  onOpenChange: (open: boolean) => void;
  /** Depois de criar: o caminho da categoria nova (a tela escolhe ela no filtro). */
  onCreated?: (path: string[]) => void;
}

/**
 * Criar uma categoria nova em qualquer lugar, mesmo vazia: **Nome** (aceita vários níveis separados
 * por "/") e **Dentro de** (o nível principal ou qualquer categoria com espaço). A categoria é uma
 * pasta e existe mesmo sem páginas.
 */
export function CategoryCreateDialog({
  parent,
  tree,
  onOpenChange,
  onCreated,
}: CategoryCreateDialogProps) {
  return (
    <BusyDialog open={parent !== null} onOpenChange={onOpenChange} className="sm:max-w-md">
      {(onBusyChange) =>
        parent && (
          <CategoryCreateForm
            key={parent.join('\u0000')}
            initialParent={parent}
            tree={tree}
            onDone={() => onOpenChange(false)}
            onBusyChange={onBusyChange}
            onCreated={onCreated}
          />
        )
      }
    </BusyDialog>
  );
}

interface CategoryCreateFormProps {
  initialParent: string[];
  tree: CategoryNode[];
  onDone: () => void;
  onBusyChange: (busy: boolean) => void;
  onCreated?: (path: string[]) => void;
}

function CategoryCreateForm({
  initialParent,
  tree,
  onDone,
  onBusyChange,
  onCreated,
}: CategoryCreateFormProps) {
  const nameId = useId();
  const [text, setText] = useState('');
  const [parent, setParent] = useState(initialParent);
  const create = useCreateCategory();
  const snackbar = useSnackbar();

  const places = useMemo(() => placesForNew(tree, CategoryCreateStrings.root), [tree]);
  const options = places.map((place) => ({
    id: place.path.length === 0 ? ROOT : place.path.join('\u0000'),
    label: place.label,
  }));
  const parentId = parent.length === 0 ? ROOT : parent.join('\u0000');

  const names = parseCategoryNames(text);
  const path = [...parent, ...names];
  const tooDeep = names.length > 0 && path.length > MAX_CATEGORY_LEVELS;
  const exists = names.length > 0 && !tooDeep && findCategory(tree, path) !== undefined;
  const canCreate = names.length > 0 && !tooDeep && !exists && !create.isPending;

  // enquanto cria, o diálogo não fecha (Esc, clique fora ou X)
  useReportBusy(create.isPending, onBusyChange);

  function chooseParent(id: string | null) {
    const place = places.find((_own, index) => options[index].id === id);

    if (place) {
      setParent(place.path);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    create.mutate(path, {
      onSuccess: () => {
        snackbar.success(CategoryCreateStrings.done);
        onCreated?.(path);
        onDone();
      },
    });
  }

  return (
    <DialogForm onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{CategoryCreateStrings.title}</DialogTitle>

        <DialogDescription>{CategoryCreateStrings.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor={nameId}>{CategoryCreateStrings.name}</Label>

        <Input
          id={nameId}
          value={text}
          placeholder={CategoryCreateStrings.namePlaceholder}
          maxLength={MAX_NAME_LENGTH * MAX_CATEGORY_LEVELS}
          autoFocus
          disabled={create.isPending}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>{CategoryCreateStrings.parent}</Label>

        <OptionSelect
          value={parentId}
          options={options}
          placeholder={CategoryCreateStrings.root}
          label={CategoryCreateStrings.parent}
          triggerWidth="w-full"
          contentWidth="w-72"
          disabled={create.isPending}
          onValueChange={chooseParent}
        />
      </div>

      {names.length > 0 && !tooDeep && (
        <p className="text-sm">
          {CategoryCreateStrings.willBeIn} <strong>{path.join(' › ')}</strong>
        </p>
      )}

      {names.length > 1 && !tooDeep && !exists && (
        <Callout tone="info">{CategoryCreateStrings.willCreate(names.length)}</Callout>
      )}

      {exists && <Callout tone="warning">{CategoryCreateStrings.exists}</Callout>}

      {tooDeep && <Callout tone="warning">{CategoryCreateStrings.tooDeep}</Callout>}

      {create.isError && (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message || CategoryCreateStrings.failed}
        </p>
      )}

      <DialogFooter>
        <FormButtons
          onCancel={onDone}
          pending={create.isPending}
          canSubmit={canCreate}
          cancelLabel={CategoryCreateStrings.cancel}
        >
          {create.isPending ? CategoryCreateStrings.creating : CategoryCreateStrings.create}
        </FormButtons>
      </DialogFooter>
    </DialogForm>
  );
}
