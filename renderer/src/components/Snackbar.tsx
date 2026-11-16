import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Hexagon, X, type LucideIcon } from 'lucide-react';

import { cn } from '#lib/utils';

export const SNACKBAR_DURATION_MS = 3000;
/** Erros ficam mais tempo na tela: dá tempo de ler o que falhou. */
export const SNACKBAR_ERROR_DURATION_MS = 6000;
/** Tempo da animação de saída: a mensagem só sai do DOM depois dela. */
export const SNACKBAR_EXIT_MS = 240;

/**
 * - `success` e `error`: resultado de uma ação, no canto inferior direito.
 * - `created`: algo novo nasceu (tarefa, página...), embaixo no centro, com atalho opcional.
 */
export type SnackbarKind = 'success' | 'error' | 'created';

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

interface SnackbarApi {
  /** Sucesso no canto inferior direito (atalho de `success`). */
  show(message: string, action?: SnackbarAction): void;
  /** Sucesso; o botão opcional serve, por exemplo, para "Desfazer". */
  success(message: string, action?: SnackbarAction): void;
  error(message: string): void;
  /** Criação de algo: embaixo no centro, com um botão opcional (ex.: "Acompanhar"). */
  created(message: string, action?: SnackbarAction): void;
}

const SnackbarContext = createContext<SnackbarApi | null>(null);

type Region = 'corner' | 'center';

const REGION_OF: Record<SnackbarKind, Region> = {
  success: 'corner',
  error: 'corner',
  created: 'center',
};

const STYLES: Record<SnackbarKind, { icon: LucideIcon; iconClass: string; barClass: string }> = {
  success: { icon: CircleCheck, iconClass: 'text-emerald-500', barClass: 'bg-emerald-500' },
  error: { icon: CircleAlert, iconClass: 'text-destructive', barClass: 'bg-destructive' },
  created: { icon: Hexagon, iconClass: 'text-brand', barClass: 'bg-brand' },
};

interface ActiveMessage {
  id: number;
  kind: SnackbarKind;
  text: string;
  action?: SnackbarAction;
  durationMs: number;
}

type Slots = Record<Region, { message: ActiveMessage; leaving: boolean } | null>;

export function SnackbarProvider({
  children,
  duration = SNACKBAR_DURATION_MS,
  raised = false,
}: {
  children: ReactNode;
  duration?: number;
  /** Sobe a mensagem para não cobrir uma barra fixa no rodapé (ex.: o aviso de reinício). */
  raised?: boolean;
}) {
  const [slots, setSlots] = useState<Slots>({ corner: null, center: null });
  const timers = useRef<Record<Region, ReturnType<typeof setTimeout> | undefined>>({
    corner: undefined,
    center: undefined,
  });
  const counter = useRef(0);

  // Sai com uma animação curta e só então some do DOM.
  const dismiss = useCallback((region: Region) => {
    clearTimeout(timers.current[region]);
    setSlots((current) =>
      current[region] ? { ...current, [region]: { ...current[region], leaving: true } } : current,
    );
    timers.current[region] = setTimeout(() => {
      setSlots((current) => ({ ...current, [region]: null }));
    }, SNACKBAR_EXIT_MS);
  }, []);

  // Uma mensagem por região: a nova substitui a anterior e reinicia o tempo.
  const push = useCallback(
    (kind: SnackbarKind, text: string, action?: SnackbarAction) => {
      const region = REGION_OF[kind];
      const durationMs =
        kind === 'error' ? Math.max(duration, SNACKBAR_ERROR_DURATION_MS) : duration;

      clearTimeout(timers.current[region]);
      counter.current += 1;
      setSlots((current) => ({
        ...current,
        [region]: {
          message: { id: counter.current, kind, text, action, durationMs },
          leaving: false,
        },
      }));
      timers.current[region] = setTimeout(() => dismiss(region), durationMs);
    },
    [dismiss, duration],
  );

  useEffect(() => {
    const pending = timers.current;

    return () => {
      clearTimeout(pending.corner);
      clearTimeout(pending.center);
    };
  }, []);

  const api = useMemo<SnackbarApi>(
    () => ({
      show: (message, action) => push('success', message, action),
      success: (message, action) => push('success', message, action),
      error: (message) => push('error', message),
      created: (message, action) => push('created', message, action),
    }),
    [push],
  );

  const renderMessage = (region: Region) => {
    const slot = slots[region];

    if (!slot) {
      return null;
    }

    const { message, leaving } = slot;
    const { icon: Icon, iconClass, barClass } = STYLES[message.kind];

    return (
      <div
        key={message.id}
        role={message.kind === 'error' ? 'alert' : 'status'}
        data-kind={message.kind}
        className={cn(
          'pointer-events-auto relative flex max-w-[calc(100vw-2rem)] items-center gap-3 overflow-hidden rounded-lg border bg-card px-4 py-3 text-sm shadow-lg',
          leaving ? 'animate-exit-down' : 'animate-enter',
        )}
      >
        <Icon className={cn('size-4 shrink-0', iconClass)} />
        <span className="min-w-0">{message.text}</span>

        {message.action && (
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
            onClick={() => {
              message.action?.onClick();
              dismiss(region);
            }}
          >
            {message.action.label}
          </button>
        )}

        <button
          type="button"
          aria-label="Fechar"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => dismiss(region)}
        >
          <X className="size-4" />
        </button>

        {/* Progresso: a barra se esgota no tempo em que a mensagem fica na tela. */}
        <span
          aria-hidden="true"
          data-testid="snackbar-progress"
          className={cn('animate-countdown absolute inset-x-0 bottom-0 h-0.5', barClass)}
          style={{ animationDuration: `${message.durationMs}ms` }}
        />
      </div>
    );
  };

  return (
    <SnackbarContext.Provider value={api}>
      {children}

      <div
        data-region="corner"
        className={cn(
          'pointer-events-none fixed right-4 z-50 flex flex-col items-end',
          raised ? 'bottom-20' : 'bottom-4',
        )}
      >
        {renderMessage('corner')}
      </div>

      <div
        data-region="center"
        className={cn(
          'pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4',
          raised ? 'bottom-20' : 'bottom-4',
        )}
      >
        {renderMessage('center')}
      </div>
    </SnackbarContext.Provider>
  );
}

/** Sem provider (testes de telas isoladas) as mensagens simplesmente não aparecem. No app, `App` e `SettingsApp` sempre o montam. */
const SILENT_API: SnackbarApi = {
  show: () => undefined,
  success: () => undefined,
  error: () => undefined,
  created: () => undefined,
};

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext) ?? SILENT_API;
}
