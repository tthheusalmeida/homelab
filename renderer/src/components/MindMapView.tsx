import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import {
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Maximize,
  Plus,
} from 'lucide-react';

import { cn } from '#lib/utils';
import { HEX_CLIP } from '#lib/hex';
import type { MindMap, MindMapNode } from '#lib/mind-map';
import {
  addBranch,
  addChild,
  canAddBranch,
  canAddChild,
  pathKey,
  removeNode,
  setSubtitle,
  updateNode,
  type MindMapDraft,
  type NodePath,
} from '#lib/mind-map-edit';
import { MIND_MAP_EDIT_LIMITS } from '#shared/mind-map-limits';
import { captureMindMapPng, mindMapImageName } from '#lib/mind-map-image';
import { HexDot, HexLoader, HoneycombBackdrop, Logo } from './Hex';
import { ActionMenu } from './ActionMenu';
import { FloatingToolbar, ToolbarSeparator, ZoomButtons } from './FloatingToolbar';
import { IconButton } from './IconButton';
import { MathText } from './MathText';
import { EditableTopic, type EditOps } from './MindMapEditable';

/** Acima disso o mapa abre com os ramos recolhidos (a pessoa abre o que quiser). */
const LARGE_MAP_NODES = 80;
/**
 * Largura (px) da área a partir da qual o título fica no meio e os ramos dos dois lados, com setas.
 * O desenho largo mede ~1310 px (dois cartões de 22em, o título de 24em e o espaço das setas), então
 * com 1000 px ele cabe ainda com ~70% do tamanho; abaixo disso os ramos vão em uma coluna.
 */
const WIDE_MIN_PX = 1000;
/** Folga (px) entre o desenho e a borda da área. */
const FRAME_PAD = 32;
/** Limites do tamanho do mapa (1 = tamanho normal). */
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
/** Quanto cada clique nos botões de tamanho multiplica ou divide. */
const ZOOM_STEP = 1.2;
/** Quanto o ponteiro precisa andar (px) para o gesto contar como arrastar, e não como clique. */
const DRAG_THRESHOLD = 4;


interface View {
  x: number;
  y: number;
  /** Tamanho do desenho (1 = normal). */
  k: number;
}

interface MindMapViewProps {
  /** O mapa a desenhar (da IA ou o simples, montado do texto; ver `SummaryMindMap`). */
  map: MindMap;
  /** Botões extras no começo dos controles (ex.: gerar com IA). */
  toolbar?: ReactNode;
  /** Aviso sobre o mapa (ex.: erro da IA), flutuando no topo da área. */
  notice?: ReactNode;
  /** Cobre a área do mapa, no centro (ex.: a colmeia carregando enquanto a IA gera). */
  overlay?: ReactNode;
  /**
   * Quem salva a imagem PNG do mapa (recebe o nome sugerido e o PNG em base64). Sem isso, não há
   * botões de baixar (com fundo e sem fundo). Se a imagem não puder ser feita ou salva, `onDownloadError` avisa.
   */
  onDownloadImage?: (image: { fileName: string; dataBase64: string }) => Promise<void>;
  onDownloadError?: (message: string) => void;
  /**
   * Modo de edição: o mapa mostra o **rascunho** (não o `map`) com campos no lugar dos textos, e
   * cada mudança chega em `onChange`. Quem guarda ou descarta o rascunho é quem usa o componente.
   */
  edit?: { draft: MindMapDraft; onChange: (draft: MindMapDraft) => void };
  className?: string;
}

const DOWNLOAD_FAILED = 'Não foi possível gerar a imagem do mapa. Tente de novo.';

/** Itens de dentro de um ramo: termo e frase curta; os detalhes viram linhas com seta. */
function Branches({ nodes, depth }: { nodes: MindMapNode[]; depth: number }) {
  return (
    <ul className={cn('space-y-2', depth > 2 && 'mt-1 space-y-0.5')}>
      {nodes.map((node, index) => (
        <li key={`${node.label}-${index}`}>
          {depth <= 2 ? (
            <div className="flex items-start gap-2">
              <HexDot className="mt-[0.5em] bg-brand" />

              <div className="min-w-0">
                <p className="font-semibold leading-snug">
                  <MathText>{node.label}</MathText>
                </p>

                {node.note && (
                  <p className="text-[0.9em] leading-snug text-muted-foreground">
                    <MathText>{node.note}</MathText>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[0.88em] leading-snug text-muted-foreground">
              <span aria-hidden="true" className="text-brand-text">
                ↳{' '}
              </span>
              <span className="font-medium text-foreground/90">
                <MathText>{node.label}</MathText>
              </span>
              {node.note && (
                <span>
                  {' — '}
                  <MathText>{node.note}</MathText>
                </span>
              )}
            </p>
          )}

          {node.children.length > 0 && (
            <div className="mt-1 ml-[1.1em]">
              <Branches nodes={node.children} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Topic({
  node,
  index,
  collapsed,
  onToggle,
}: {
  node: MindMapNode;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const hasDetails = node.children.length > 0;

  return (
    <section aria-label={node.label} data-card={index} className="w-[22em] max-w-full text-left">
      <button
        type="button"
        aria-expanded={hasDetails ? !collapsed : undefined}
        disabled={!hasDetails}
        onClick={onToggle}
        className="flex w-full items-start gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
      >
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

        <span className="text-[1.35em] leading-tight font-bold text-brand-text">
          <MathText>{node.label}</MathText>
        </span>
      </button>

      {node.note && (
        <p className="mt-1 text-[0.95em] leading-snug text-foreground/85">
          <MathText>{node.note}</MathText>
        </p>
      )}

      {hasDetails && !collapsed && (
        <div className="mt-2.5 animate-enter-fade">
          <Branches nodes={node.children} depth={2} />
        </div>
      )}
    </section>
  );
}

/**
 * Mapa mental no estilo de um caderno de estudos, com a identidade de colmeia: o título (e uma
 * linha sobre o assunto) no meio, cada ramo ao redor com o termo em destaque e uma frase curta
 * embaixo, ligados por setas finas. Uma só cor, a de destaque do app (muda com o tema). Todo o
 * texto fica alinhado à esquerda. Em largura estreita os ramos vão em uma coluna, sem setas.
 *
 * É uma área em que se **arrasta** para mover e se **rola a roda** para ampliar (também há botões
 * de tamanho e "Ajustar", que faz o mapa inteiro caber). Clicar no termo de um ramo recolhe ou abre
 * os detalhes. Ver `docs/mapa-mental.md`.
 */
export function MindMapView({
  map,
  toolbar,
  notice,
  overlay,
  onDownloadImage,
  onDownloadError,
  edit,
  className,
}: MindMapViewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const arrowId = `mm-arrow-${useId().replace(/:/g, '')}`;

  // Em edição o mapa é o rascunho (e nada fica recolhido: tudo precisa estar à mão para editar).
  const nodes = edit ? edit.draft.nodes : map.nodes;
  const subtitle = edit ? edit.draft.subtitle : map.subtitle;
  const large = map.size > LARGE_MAP_NODES;
  const allIndexes = () => new Set(map.nodes.map((_, index) => index));

  const [view, setView] = useState<View>({ x: FRAME_PAD, y: FRAME_PAD, k: 1 });
  const [collapsed, setCollapsed] = useState<Set<number>>(() => (large ? allIndexes() : new Set()));
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [arrows, setArrows] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const viewRef = useRef(view);
  const drag = useRef<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const justDragged = useRef(false);
  const fitAfterRender = useRef(false);

  viewRef.current = view;

  const wide = frameSize.w >= WIDE_MIN_PX;
  const leftCount = Math.ceil(nodes.length / 2);

  // Mapa novo: volta ao estado inicial (aberto, ou recolhido se for grande).
  useEffect(() => {
    setCollapsed(large ? allIndexes() : new Set());
    fitAfterRender.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Tamanho da área (decide o desenho largo ou em coluna; mudou, o mapa se ajusta de novo).
  useLayoutEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      setFrameSize((current) => (current.w === w && current.h === h ? current : { w, h }));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  /**
   * Faz o mapa inteiro caber na área e o deixa **centralizado** (o título no meio da área). Em coluna
   * estreita só a largura precisa caber: se for mais alta que a área, começa pelo topo e se arrasta.
   */
  const fit = useCallback(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;

    if (!frame || !stage) {
      return;
    }

    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    const stageW = stage.offsetWidth;
    const stageH = stage.offsetHeight;

    if (!frameW || !frameH || !stageW || !stageH) {
      return;
    }

    const k = Math.max(
      MIN_ZOOM,
      Math.min(1, (frameW - FRAME_PAD * 2) / stageW, wide ? (frameH - FRAME_PAD * 2) / stageH : 1),
    );

    setView({
      k,
      x: (frameW - stageW * k) / 2,
      y: Math.max(FRAME_PAD, (frameH - stageH * k) / 2),
    });
  }, [wide]);

  // Depois de mudar o mapa, a largura ou o recolhido de todos, o mapa se ajusta de novo.
  useLayoutEffect(() => {
    fit();
  }, [fit, map, frameSize.w, frameSize.h]);

  useLayoutEffect(() => {
    if (fitAfterRender.current) {
      fitAfterRender.current = false;
      fit();
    }
  }, [collapsed, fit]);

  /** Muda o tamanho mantendo parado o ponto (da tela) sob o ponteiro. */
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    setView((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
      const ratio = k / current.k;

      return { k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  }, []);

  const zoomFromCenter = (factor: number) => {
    const rect = frameRef.current?.getBoundingClientRect();

    if (rect) {
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    }
  };

  // A roda do mouse amplia (precisa de ouvinte não passivo para não rolar a página junto).
  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015));
    };

    frame.addEventListener('wheel', onWheel, { passive: false });

    return () => frame.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Em um campo de texto, arrastar é selecionar o texto, não mover o mapa.
    if (event.button !== 0 || (event.target as HTMLElement).closest('input, textarea')) {
      return;
    }

    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: viewRef.current.x,
      y: viewRef.current.y,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;

    if (!current) {
      return;
    }

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (!current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }

      // Só agora vira arrastar: antes disso o clique em um termo continua valendo.
      current.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    setView((previous) => ({ ...previous, x: current.x + dx, y: current.y + dy }));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.moved) {
      justDragged.current = true;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setDragging(false);
    }

    drag.current = null;
  };

  // Soltar depois de arrastar não pode contar como clique no termo sob o ponteiro.
  const swallowClickAfterDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (justDragged.current) {
      justDragged.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  };

  // As setas saem das bordas do título e chegam a cada ramo (medidas na tela, no tamanho normal).
  const drawArrows = useCallback(() => {
    const stage = stageRef.current;
    const hub = hubRef.current;

    if (!stage || !hub || !wide) {
      setArrows([]);
      return;
    }

    const { k } = viewRef.current;
    const base = stage.getBoundingClientRect();
    const center = hub.getBoundingClientRect();
    const natural = (value: number, origin: number) => (value - origin) / k;

    setArrows(
      nodes.map((_, index) => {
        const badge = stage.querySelector<HTMLElement>(`[data-anchor="${index}"]`);
        const card = stage.querySelector<HTMLElement>(`[data-card="${index}"]`);

        if (!badge || !card) {
          return '';
        }

        const badgeRect = badge.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const left = index < leftCount;
        const direction = left ? -1 : 1;
        const startX = natural(left ? center.left : center.right, base.left);
        const startY = natural(center.top + center.height / 2, base.top);
        const endX = natural(left ? cardRect.right + 10 : badgeRect.left - 8, base.left);
        const endY = natural(badgeRect.top + badgeRect.height / 2, base.top);
        const reach = Math.abs(endX - startX) * 0.55;

        return `M${startX} ${startY} C${startX + direction * reach} ${startY}, ${endX - direction * reach} ${endY}, ${endX} ${endY}`;
      }),
    );
  }, [nodes, leftCount, wide]);

  useLayoutEffect(() => {
    drawArrows();
  }, [drawArrows, collapsed, frameSize.w, edit?.draft]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(drawArrows);

    observer.observe(stage);

    return () => observer.disconnect();
  }, [drawArrows]);

  const toggle = (index: number) =>
    setCollapsed((current) => {
      const next = new Set(current);

      if (!next.delete(index)) {
        next.add(index);
      }

      return next;
    });

  const allOpen = collapsed.size === 0;

  const toggleAll = () => {
    fitAfterRender.current = true;
    setCollapsed(allOpen ? allIndexes() : new Set());
  };

  // Em edição, cada mudança vai para o rascunho de quem usa o componente.
  const focusRef = useRef<string | null>(null);
  const ops: EditOps | null = edit
    ? {
        update: (path, patch) => edit.onChange(updateNode(edit.draft, path, patch)),
        addChild: (path: NodePath) => {
          const added = addChild(edit.draft, path);

          if (added.path) {
            focusRef.current = pathKey(added.path);
            edit.onChange(added.draft);
          }
        },
        remove: (path) => edit.onChange(removeNode(edit.draft, path)),
        canAddChild: (path) => canAddChild(edit.draft, path),
        focusRef,
      }
    : null;

  const addNewBranch = () => {
    if (!edit) {
      return;
    }

    const added = addBranch(edit.draft);

    if (added.path) {
      focusRef.current = pathKey(added.path);
      edit.onChange(added.draft);
    }
  };

  const topic = (index: number) =>
    ops ? (
      <EditableTopic key={index} node={nodes[index]} index={index} ops={ops} />
    ) : (
      <Topic
        key={`${nodes[index].label}-${index}`}
        node={nodes[index]}
        index={index}
        collapsed={collapsed.has(index)}
        onToggle={() => toggle(index)}
      />
    );

  const indexes = nodes.map((_, index) => index);

  // O nó central tem folga própria (caixa com respiro): o título quebra em linhas e as setas saem
  // da borda da caixa, sem encostar no texto.
  const hub = (
    <div
      ref={hubRef}
      className="mx-auto flex w-[24em] max-w-full flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-[1.6em] py-[1.5em] text-center"
    >
      <Logo className="size-[2.4em]" />

      <h2 className="text-[1.7em] leading-tight font-bold tracking-tight text-balance break-words">
        {map.title}
      </h2>

      {edit ? (
        <>
          <input
            type="text"
            aria-label="Subtítulo do mapa"
            value={edit.draft.subtitle}
            maxLength={MIND_MAP_EDIT_LIMITS.maxSubtitleChars}
            placeholder="Do que o resumo trata (opcional)"
            onChange={(event) => edit.onChange(setSubtitle(edit.draft, event.target.value))}
            className="w-full rounded-sm border-0 border-b border-dashed border-brand/40 bg-transparent px-0.5 text-center text-[1.05em] outline-none select-text placeholder:text-muted-foreground/60 focus:border-solid focus:border-brand focus:bg-brand/5"
          />

          <p className="text-[0.75em] text-muted-foreground">
            O título é o da página: edite-o em &ldquo;Sobre a página&rdquo;.
          </p>
        </>
      ) : (
        subtitle && (
          <p className="text-[1.05em] leading-snug text-balance text-muted-foreground">
            {subtitle}
          </p>
        )
      )}

      <div aria-hidden="true" className="flex w-full items-center gap-2 text-brand">
        <span className="h-px flex-1 bg-current opacity-40" />
        <HexDot className="size-3 bg-brand" />
        <span className="h-px flex-1 bg-current opacity-40" />
      </div>
    </div>
  );

  // Qual imagem está sendo feita agora (`null` = nenhuma): os dois botões esperam a que está em curso.
  const [exporting, setExporting] = useState<'solid' | 'transparent' | null>(null);

  // A foto é do mapa inteiro, no tamanho natural, mesmo que a tela esteja ampliada ou movida. Com
  // `transparent`, sai sem o fundo do tema (para pôr sobre qualquer coisa).
  const downloadImage = async (transparent: boolean) => {
    const stage = stageRef.current;
    const frame = frameRef.current;

    if (!stage || !frame || !onDownloadImage || exporting) {
      return;
    }

    setExporting(transparent ? 'transparent' : 'solid');

    try {
      const dataBase64 = await captureMindMapPng(
        stage,
        transparent ? null : getComputedStyle(frame).backgroundColor,
      );

      await onDownloadImage({ fileName: mindMapImageName(map.title, transparent), dataBase64 });
    } catch (error) {
      onDownloadError?.(error instanceof Error && error.message ? error.message : DOWNLOAD_FAILED);
    } finally {
      setExporting(null);
    }
  };

  const zoomPercent = Math.round(view.k * 100);

  // Os controles são só ícones; o tooltip diz o que cada um faz.
  const controls = (
    <>
      {toolbar}

      {toolbar && <ToolbarSeparator />}

      {edit && (
        <>
          <IconButton
            label="Adicionar ramo"
            disabled={!canAddBranch(edit.draft)}
            onClick={addNewBranch}
          >
            <Plus />
          </IconButton>

          <ToolbarSeparator />
        </>
      )}

      <ZoomButtons
        percent={zoomPercent}
        decreaseLabel="Diminuir o mapa"
        increaseLabel="Aumentar o mapa"
        sizeLabel="Tamanho do mapa"
        canDecrease={view.k > MIN_ZOOM}
        canIncrease={view.k < MAX_ZOOM}
        onDecrease={() => zoomFromCenter(1 / ZOOM_STEP)}
        onIncrease={() => zoomFromCenter(ZOOM_STEP)}
      />

      <ToolbarSeparator />

      <IconButton label="Ajustar o mapa à tela" onClick={fit}>
        <Maximize />
      </IconButton>

      <IconButton
        label={allOpen ? 'Recolher todos os ramos' : 'Expandir todos os ramos'}
        disabled={Boolean(edit)}
        onClick={toggleAll}
      >
        {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
      </IconButton>

      {onDownloadImage && (
        <>
          <ToolbarSeparator />

          <ActionMenu
            label="Baixar"
            icon={Download}
            iconOnly
            loading={exporting !== null}
            groups={[
              [
                { id: 'png', label: 'PNG', onSelect: () => void downloadImage(false) },
                {
                  id: 'png-transparent',
                  label: 'PNG transparente',
                  onSelect: () => void downloadImage(true),
                },
              ],
            ]}
          />
        </>
      )}
    </>
  );

  return (
    <div className={cn('h-full', className)}>
      <div
        ref={frameRef}
        data-dragging={dragging}
        // Fonte e cor próprias: o mapa não acompanha o tamanho de letra, o zoom nem as cores da leitura.
        style={{ fontSize: '16px' }}
        className={cn(
          'relative touch-none overflow-hidden bg-card font-sans text-foreground select-none',
          'h-full',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={swallowClickAfterDrag}
      >
        <HoneycombBackdrop />
        <HoneycombBackdrop className="top-auto right-auto -bottom-4 -left-8 rotate-180" />

        <div
          ref={stageRef}
          role="group"
          aria-label={`Mapa mental de ${map.title}`}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
          className="absolute top-0 left-0 w-max origin-top-left"
        >
          {wide && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full overflow-visible text-brand"
            >
              <defs>
                <marker
                  id={arrowId}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0 0L10 5L0 10z" fill="currentColor" />
                </marker>
              </defs>

              {arrows.map(
                (path, index) =>
                  path && (
                    <path
                      key={index}
                      d={path}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      opacity="0.65"
                      markerEnd={`url(#${arrowId})`}
                    />
                  ),
              )}
            </svg>
          )}

          {wide ? (
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-28">
              <div className="flex flex-col items-end gap-9">
                {indexes.slice(0, leftCount).map(topic)}
              </div>

              {hub}

              <div className="flex flex-col items-start gap-9">
                {indexes.slice(leftCount).map(topic)}
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col items-center gap-7">
              {hub}

              {indexes.map(topic)}
            </div>
          )}
        </div>

        {notice && (
          <div
            className="absolute top-4 left-1/2 z-20 w-[min(38rem,calc(100%-2rem))] -translate-x-1/2 cursor-default"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {notice}
          </div>
        )}

        <FloatingToolbar label="Controles do mapa">{controls}</FloatingToolbar>

        {overlay && (
          <div className="absolute inset-0 z-30 flex animate-enter-fade cursor-default items-center justify-center bg-background/85 backdrop-blur-[2px]">
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}
