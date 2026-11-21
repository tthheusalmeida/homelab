import type { MutableRefObject } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { cn } from '#lib/utils';
import { HEX_CLIP } from '#lib/hex';
import type { MindMapNode } from '#lib/mind-map';
import { pathKey, type NodePath } from '#lib/mind-map-edit';
import { MIND_MAP_EDIT_LIMITS } from '#shared/mind-map-limits';

import { HexDot } from './Hex';
import { IconButton } from './IconButton';

/** O que a edição pode fazer com um nó (quem desenha o mapa implementa). */
export interface EditOps {
  update(path: NodePath, patch: { label?: string; note?: string }): void;
  addChild(path: NodePath): void;
  remove(path: NodePath): void;
  canAddChild(path: NodePath): boolean;
  /** Caminho (`"2.0"`) do nó recém-criado, para pôr o foco no campo do termo dele. */
  focusRef: MutableRefObject<string | null>;
}


/** Campo de texto "no papel": sem caixa, com um tracejado embaixo que vira linha cheia ao focar. */
const FIELD =
  'w-full rounded-sm border-0 border-b border-dashed border-brand/40 bg-transparent px-0.5 outline-none select-text placeholder:text-muted-foreground/60 focus:border-solid focus:border-brand focus:bg-brand/5';

/** Nome do nó para leitores de tela e tooltips: "ramo 2" ou "subtópico 2.1". */
export function describeNode(path: NodePath): string {
  return path.length === 1
    ? `ramo ${path[0] + 1}`
    : `subtópico ${path.map((i) => i + 1).join('.')}`;
}

/** Foca o campo do termo quando este nó acabou de ser criado. */
const focusWhenCreated = (ops: EditOps, path: NodePath) => (element: HTMLInputElement | null) => {
  if (element && ops.focusRef.current === pathKey(path)) {
    ops.focusRef.current = null;
    element.focus();
  }
};

function NodeFields({
  node,
  path,
  ops,
  termClassName,
}: {
  node: MindMapNode;
  path: NodePath;
  ops: EditOps;
  termClassName: string;
}) {
  const name = describeNode(path);

  return (
    <>
      <input
        ref={focusWhenCreated(ops, path)}
        type="text"
        aria-label={`Termo do ${name}`}
        value={node.label}
        maxLength={MIND_MAP_EDIT_LIMITS.maxLabelChars}
        placeholder="Escreva o termo"
        onChange={(event) => ops.update(path, { label: event.target.value })}
        className={cn(FIELD, termClassName)}
      />

      <textarea
        aria-label={`Frase do ${name}`}
        value={node.note ?? ''}
        rows={1}
        maxLength={MIND_MAP_EDIT_LIMITS.maxNoteChars}
        placeholder="Frase curta (opcional)"
        onChange={(event) => ops.update(path, { note: event.target.value })}
        className={cn(FIELD, 'mt-0.5 resize-none text-[0.9em] leading-snug field-sizing-content')}
      />

      <div className="mt-1 flex gap-1">
        <IconButton
          size="icon-xs"
          label={`Adicionar subtópico ao ${name}`}
          disabled={!ops.canAddChild(path)}
          onClick={() => ops.addChild(path)}
        >
          <Plus />
        </IconButton>

        <IconButton
          size="icon-xs"
          variant="ghost"
          label={
            node.children.length > 0
              ? `Excluir o ${name} e o que está dentro dele`
              : `Excluir o ${name}`
          }
          onClick={() => ops.remove(path)}
        >
          <Trash2 />
        </IconButton>
      </div>
    </>
  );
}

/** Os subtópicos de um nó, editáveis: termo, frase curta, adicionar filho e excluir. */
function EditableBranches({
  nodes,
  parent,
  ops,
}: {
  nodes: MindMapNode[];
  parent: NodePath;
  ops: EditOps;
}) {
  return (
    <ul className="space-y-3">
      {nodes.map((node, index) => {
        const path = [...parent, index];
        const deep = path.length > 2;

        return (
          <li key={index}>
            <div className="flex items-start gap-2">
              {deep ? (
                <span aria-hidden="true" className="mt-[0.15em] text-brand-text">
                  ↳
                </span>
              ) : (
                <HexDot className="mt-[0.7em] bg-brand" />
              )}

              <div className="min-w-0 flex-1">
                <NodeFields
                  node={node}
                  path={path}
                  ops={ops}
                  termClassName={deep ? 'text-[0.9em] font-medium' : 'font-semibold'}
                />
              </div>
            </div>

            {node.children.length > 0 && (
              <div className="mt-2 ml-[1.1em]">
                <EditableBranches nodes={node.children} parent={path} ops={ops} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Um ramo de primeiro nível, editável (mesmo desenho do ramo normal, com campos no lugar do texto). */
export function EditableTopic({
  node,
  index,
  ops,
}: {
  node: MindMapNode;
  index: number;
  ops: EditOps;
}) {
  const path = [index];

  return (
    <section
      aria-label={node.label || `Ramo ${index + 1}`}
      data-card={index}
      className="w-[22em] max-w-full text-left"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          data-anchor={index}
          className={cn(
            'mt-[0.2em] grid size-[1.9em] shrink-0 place-items-center bg-brand text-[0.8em] font-bold text-primary-foreground',
            HEX_CLIP,
          )}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <NodeFields
            node={node}
            path={path}
            ops={ops}
            termClassName="text-[1.35em] leading-tight font-bold text-brand-text"
          />
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-3">
          <EditableBranches nodes={node.children} parent={path} ops={ops} />
        </div>
      )}
    </section>
  );
}
